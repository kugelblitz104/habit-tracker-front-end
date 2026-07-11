import type {
    HabitKPIs,
    HabitRead,
    HabitStreak,
    HabitUpdate,
    TrackerCreate,
    TrackerLite,
    TrackerRead,
    TrackerUpdate
} from '@/api';
import { deleteHabit } from '@/features/habits/api/delete-habits';
import { getHabit } from '@/features/habits/api/get-habits';
import { useHabitKpis } from '@/features/habits/api/get-habit-kpis';
import { useHabitStreaks } from '@/features/habits/api/get-habit-streaks';
import { updateHabit } from '@/features/habits/api/update-habits';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { useTrackerMutations } from '@/features/trackers/hooks/use-tracker-mutations';
import {
    adaptKpisToServerShape,
    adaptStreaksToServerShape
} from '@/features/trackers/utils/kpi-adapter';
import { toLocalDateString } from '@/lib/date-utils';
import { TrackerStatus } from '@/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Data layer for the habit detail view: habit/tracker/KPI/streak queries, the
 * habit edit/delete mutations, and the optimistic tracker create/update
 * handlers (local tracker-history patch + KPI/streak cache patch, reconciled
 * once the server responds). Extracted from `HabitDetailBody` so that
 * component can stay presentation-only. The tracker create/update mutations
 * themselves are the same shared `useTrackerMutations` used by the dashboard
 * grid and the Today panel; the extra KPI/streak reconciliation plugs in via
 * its `onSuccess` option.
 */
export const useHabitDetailData = (habitId: number) => {
    const [habit, setHabit] = useState<HabitRead>();
    const [trackers, setTrackers] = useState<TrackerLite[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Imported habits can hold trackers OLDER than created_date; when the server
    // reports history beyond the created-date window, widen to the full cap once.
    const [extendHistory, setExtendHistory] = useState(false);

    // Days from habit creation to today – used to fetch the full tracker history.
    const allTrackersDays = useMemo(() => {
        if (extendHistory) return 3660;
        if (!habit?.created_date) return 365;
        const created = new Date(habit.created_date);
        const today = new Date();
        const diff = Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.min(Math.max(diff, 60), 3660);
    }, [habit?.created_date, extendHistory]);

    // queries
    const habitQuery = useQuery({
        queryKey: ['habit', { habitId }],
        queryFn: () => getHabit(habitId),
        staleTime: 1000 * 60 // 1 minute
    });

    // Fetch the full tracker history once (habit creation → today). The calendar
    // renders whichever month is selected from this in-memory history.
    const trackersQuery = useQuery({
        queryKey: ['trackers-lite', { habitId: habit?.id, allTrackersDays }],
        queryFn: () => getTrackersLite(habit!.id, toLocalDateString(new Date()), allTrackersDays),
        enabled: !!habit,
        staleTime: 1000 * 60
    });

    // KPIs + streaks come from the SERVER (source of truth). They are optimistically
    // patched on backdate below, then reconciled via invalidation.
    const kpisQuery = useHabitKpis({ habitId });
    const streaksQuery = useHabitStreaks({ habitId });

    // Optimistically overwrite the server KPI/streak caches from the patched local
    // tracker list so backdating feels instant. Uses the adapter to convert the
    // client compute (×100 percentages, camelCase streaks) into the server shape.
    const patchKpiCaches = useCallback(
        (nextTrackers: TrackerLite[]) => {
            if (!habit) return;
            queryClient.setQueryData<HabitKPIs>(
                ['kpis', { habitId }],
                adaptKpisToServerShape(habit, nextTrackers)
            );
            queryClient.setQueryData<HabitStreak[]>(
                ['streaks', { habitId }],
                adaptStreaksToServerShape(habit, nextTrackers)
            );
        },
        [habit, habitId, queryClient]
    );

    // Reconcile the KPI/streak caches with the server once a mutation has persisted.
    const invalidateKpiCaches = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['kpis', { habitId }] });
        queryClient.invalidateQueries({ queryKey: ['streaks', { habitId }] });
    }, [habitId, queryClient]);

    // mutations
    const habitsEdit = useMutation({
        mutationFn: ({ id, update }: { id: number; update: HabitUpdate }) =>
            updateHabit(id, update),
        onSuccess: (data) => {
            setHabit(data);
            queryClient.setQueryData(['habit', { habitId }], data);
            queryClient.setQueriesData<{ habits: HabitRead[] }>(
                { queryKey: ['habits'] },
                (oldData) => {
                    if (!oldData?.habits) return oldData;
                    return {
                        ...oldData,
                        habits: oldData.habits.map((h) => (h.id === data.id ? data : h))
                    };
                }
            );
            toast.success('Habit updated successfully!');
        },
        onError: (error) => {
            toast.error(
                `Failed to update habit: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        },
        onSettled: () => {
            // Background refresh to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['habits'] });
        }
    });

    const habitsDelete = useMutation({
        mutationFn: (id: number) => deleteHabit(id),
        onSuccess: (_, deletedHabitId) => {
            // Remove habit from cache before navigating
            queryClient.setQueriesData<{ habits: HabitRead[] }>(
                { queryKey: ['habits'] },
                (oldData) => {
                    if (!oldData?.habits) return oldData;
                    return {
                        ...oldData,
                        habits: oldData.habits.filter((h) => h.id !== deletedHabitId)
                    };
                }
            );
            // Remove individual habit query from cache
            queryClient.removeQueries({
                queryKey: ['habit', { habitId: deletedHabitId }]
            });
            // Remove related tracker queries from cache
            queryClient.removeQueries({
                queryKey: ['trackers-lite', { habitId: deletedHabitId }]
            });
            setIsDeleteModalOpen(false);
        }
    });

    // Shared optimistic create/update mutations; a successful persist reconciles
    // the server-computed KPI/streak caches on top of the shared cache patch.
    const { trackerCreate, trackerUpdate } = useTrackerMutations(habitId, {
        onSuccess: invalidateKpiCaches
    });

    const handleTrackerCreate = async (tracker: TrackerCreate): Promise<TrackerRead> => {
        // Create optimistic tracker with temporary negative ID
        const tempId = -Date.now();
        const optimisticTracker: TrackerLite = {
            id: tempId,
            dated: tracker.dated ?? '',
            status: tracker.status ?? TrackerStatus.COMPLETED,
            has_note: !!tracker.note
        };

        // Optimistically add to the full history and patch the KPI/streak caches so
        // rings, streaks and the weekday chart update instantly.
        const nextTrackers = trackers.some((t) => t.dated === optimisticTracker.dated)
            ? trackers
            : [...trackers, optimisticTracker];
        setTrackers(nextTrackers);
        patchKpiCaches(nextTrackers);

        return new Promise((resolve, reject) => {
            trackerCreate.mutate(tracker, {
                onSuccess: (data) => {
                    // Replace the optimistic entry with real server data
                    const trackerLite: TrackerLite = {
                        id: data.id,
                        dated: data.dated ?? '',
                        status: data.status ?? TrackerStatus.COMPLETED,
                        has_note: !!data.note
                    };
                    setTrackers((prev) => {
                        const reconciled = prev.map((t) => (t.id === tempId ? trackerLite : t));
                        patchKpiCaches(reconciled);
                        return reconciled;
                    });
                    resolve(data);
                },
                onError: (error) => {
                    // Rollback local trackers + KPI/streak caches
                    setTrackers((prev) => {
                        const rolledBack = prev.filter((t) => t.id !== tempId);
                        patchKpiCaches(rolledBack);
                        return rolledBack;
                    });
                    toast.error(
                        `Failed to create tracker: ${
                            error instanceof Error ? error.message : 'Unknown error'
                        }`
                    );
                    reject(error);
                }
            });
        });
    };

    const handleTrackerUpdate = async (id: number, update: TrackerUpdate): Promise<TrackerRead> => {
        // Snapshot for rollback
        const previousTrackers = trackers;

        const applyUpdate = (t: TrackerLite): TrackerLite => {
            if (t.id !== id) return t;
            return {
                ...t,
                status: update.status ?? t.status,
                has_note: update.note !== undefined ? !!update.note : t.has_note
            };
        };

        // Optimistically update the full history + KPI/streak caches.
        const nextTrackers = trackers.map(applyUpdate);
        setTrackers(nextTrackers);
        patchKpiCaches(nextTrackers);

        return new Promise((resolve, reject) => {
            trackerUpdate.mutate(
                { id, update },
                {
                    onSuccess: (data) => {
                        // Reconcile with real server data
                        const trackerLite: TrackerLite = {
                            id: data.id,
                            dated: data.dated ?? '',
                            status: data.status ?? TrackerStatus.COMPLETED,
                            has_note: !!data.note
                        };
                        setTrackers((prev) => {
                            const reconciled = prev.map((t) =>
                                t.id === data.id ? trackerLite : t
                            );
                            patchKpiCaches(reconciled);
                            return reconciled;
                        });
                        resolve(data);
                    },
                    onError: (error) => {
                        // Rollback local trackers + KPI/streak caches
                        setTrackers(previousTrackers);
                        patchKpiCaches(previousTrackers);
                        toast.error(
                            `Failed to update tracker: ${
                                error instanceof Error ? error.message : 'Unknown error'
                            }`
                        );
                        reject(error);
                    }
                }
            );
        });
    };

    // Effect to set habit from query data
    useEffect(() => {
        if (habitQuery.data !== undefined) {
            setHabit(habitQuery.data);
        }
    }, [habitQuery.data]);

    // Populate full tracker history when query resolves
    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    // One-shot widen: the server flags trackers older than the fetched window
    // (imported habits whose history predates created_date).
    useEffect(() => {
        if (trackersQuery.data?.has_previous && !extendHistory) {
            setExtendHistory(true);
        }
    }, [trackersQuery.data?.has_previous, extendHistory]);

    return {
        habit,
        trackers,
        habitQuery,
        kpisQuery,
        streaksQuery,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        habitsEdit,
        habitsDelete,
        handleTrackerCreate,
        handleTrackerUpdate
    };
};
