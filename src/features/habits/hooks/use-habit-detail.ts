import type { HabitRead, TrackerCreate, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import type { HabitUpdate } from '@/api/models/HabitUpdate';
import { getHabit } from '@/features/habits/api/get-habits';
import { updateHabit } from '@/features/habits/api/update-habits';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { calculateKPIsFromTrackers, calculateStreaks } from '@/features/trackers/utils/kpi-utils';
import { toLocalDateString } from '@/lib/date-utils';
import { useResponsiveLayout, WEEKS_BY_SIZE } from '@/lib/use-responsive-layout';
import { TrackerStatus } from '@/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'react-toastify';
import { deleteHabit } from '../api/delete-habits';

export const useHabitDetail = (habitId: number) => {
    const queryClient = useQueryClient();

    const layoutSize = useResponsiveLayout();
    const weeks = WEEKS_BY_SIZE[layoutSize];
    const days = weeks * 7;

    // queries
    const habitQuery = useQuery({
        queryKey: ['habit', habitId],
        queryFn: () => getHabit(habitId),
        staleTime: 1000 * 60
    });

    const habit = habitQuery.data;

    const allTrackerDays = useMemo(() => {
        if (!habit?.created_date) return 365;
        const created = new Date(habit.created_date);
        const today = new Date();
        const diff = Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(diff, days);
    }, [habit?.created_date, days]);

    const trackersQuery = useQuery({
        queryKey: ['trackers-lite', { habitId, allTrackerDays }],
        queryFn: () => getTrackersLite(habitId, toLocalDateString(new Date()), allTrackerDays),
        staleTime: 1000 * 60
    });

    const trackers: TrackerLite[] = trackersQuery.data?.trackers ?? [];

    const habitKPIs = useMemo(() => {
        if (!habit || trackers.length === 0) return undefined;
        return calculateKPIsFromTrackers(habit, trackers);
    }, [habit, trackers]);

    const habitStreaks = useMemo(() => {
        if (!habit || trackers.length === 0) return undefined;
        return calculateStreaks(trackers, habit.frequency, habit.range, habit.created_date).filter(
            (s) => s.length > 1
        );
    }, [habit, trackers]);

    // mutations
    const habitsEdit = useMutation({
        mutationFn: ({ id, update }: { id: number; update: HabitUpdate }) =>
            updateHabit(id, update),
        onSuccess: (data) => {
            queryClient.setQueryData(['habit', habitId], data);
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
            queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
            queryClient.invalidateQueries({ queryKey: ['habits'] });
        }
    });

    const habitsDelete = useMutation({
        mutationFn: (id: number) => deleteHabit(id),
        onSuccess: (_, deletedHabitId) => {
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
            queryClient.removeQueries({ queryKey: ['habit', deletedHabitId] });
            queryClient.removeQueries({ queryKey: ['trackers-lite', { habitId: deletedHabitId }] });
        }
    });

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onMutate: async (tracker) => {
            await queryClient.cancelQueries({ queryKey: ['trackers-lite', { habitId }] });
            const previousData = queryClient.getQueriesData<{ trackers: TrackerLite[] }>({
                queryKey: ['trackers-lite', { habitId }]
            });
            const tempId = -Date.now();
            const optimisticTracker: TrackerLite = {
                id: tempId,
                dated: tracker.dated ?? '',
                status: tracker.status ?? TrackerStatus.COMPLETED,
                has_note: !!tracker.note
            };
            queryClient.setQueriesData<{ trackers: TrackerLite[] }>(
                { queryKey: ['trackers-lite', { habitId }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    if (oldData.trackers.some((t) => t.dated === optimisticTracker.dated))
                        return oldData;
                    return { ...oldData, trackers: [...oldData.trackers, optimisticTracker] };
                }
            );
            return { previousData, tempId };
        },
        onSuccess: (data, _, context) => {
            const trackerLite: TrackerLite = {
                id: data.id,
                dated: data.dated ?? '',
                status: data.status ?? TrackerStatus.COMPLETED,
                has_note: !!data.note
            };
            queryClient.setQueriesData<{ trackers: TrackerLite[] }>(
                { queryKey: ['trackers-lite', { habitId }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    return {
                        ...oldData,
                        trackers: oldData.trackers.map((t) =>
                            t.id === context?.tempId ? trackerLite : t
                        )
                    };
                }
            );
        },
        onError: (error, _, context) => {
            context?.previousData.forEach(([key, data]) => queryClient.setQueryData(key, data));
            toast.error(
                `Failed to create tracker: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['trackers-lite', { habitId }] });
        }
    });

    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onMutate: async ({ id, update }) => {
            await queryClient.cancelQueries({ queryKey: ['trackers-lite', { habitId }] });
            const previousData = queryClient.getQueriesData<{ trackers: TrackerLite[] }>({
                queryKey: ['trackers-lite', { habitId }]
            });
            queryClient.setQueriesData<{ trackers: TrackerLite[] }>(
                { queryKey: ['trackers-lite', { habitId }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    return {
                        ...oldData,
                        trackers: oldData.trackers.map((t) => {
                            if (t.id !== id) return t;
                            return {
                                ...t,
                                status: update.status ?? t.status,
                                has_note: update.note !== undefined ? !!update.note : t.has_note
                            };
                        })
                    };
                }
            );
            return { previousData };
        },
        onError: (error, _, context) => {
            context?.previousData.forEach(([key, data]) => queryClient.setQueryData(key, data));
            toast.error(
                `Failed to update tracker: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['trackers-lite', { habitId }] });
        }
    });

    // handlers
    const handleHabitUpdate = (id: number, update: HabitUpdate) => {
        habitsEdit.mutate({ id, update });
    };

    const handleHabitDelete = (id: number) => {
        habitsDelete.mutate(id);
    };

    const handleTrackerCreate = (tracker: TrackerCreate): Promise<TrackerRead> =>
        trackerCreate.mutateAsync(tracker);

    const handleTrackerUpdate = (id: number, update: TrackerUpdate): Promise<TrackerRead> =>
        trackerUpdate.mutateAsync({ id, update });

    return {
        weeks,
        days,
        habit,
        trackers,
        habitKPIs,
        habitStreaks,
        handleTrackerCreate,
        handleTrackerUpdate,
        handleHabitUpdate,
        handleHabitDelete,
        habitLoading: habitQuery.isLoading,
        trackersLoading: trackersQuery.isLoading,
        habitError: habitQuery.isError
    };
};
