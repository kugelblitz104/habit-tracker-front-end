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
import { CalendarBoard } from '@/features/habits/components/details/calendar-board';
import { HabitEditor } from '@/features/habits/components/details/habit-editor';
import { KpiBoard } from '@/features/habits/components/details/kpi-board';
import { StreakChart } from '@/features/habits/components/details/streak-chart';
import { WeekdayChart } from '@/features/habits/components/details/weekday-chart';
import { DeleteHabitModal } from '@/features/habits/components/modals/delete-habit-modal';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import {
    adaptKpisToServerShape,
    adaptStreaksToServerShape
} from '@/features/trackers/utils/kpi-adapter';
import { useAuth } from '@/lib/auth-context';
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { TrackerStatus } from '@/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil, Trash } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type HabitDetailBodyProps = {
    habitId: number;
    /** Called after a successful delete so the host can close the pane / navigate away. */
    onDeleted?: () => void;
    /**
     * Narrow-width host (the ~480px master-detail pane). Stacks the calendar and
     * analytics into a single column instead of the 2-col page layout.
     */
    compact?: boolean;
    /** Notifies the host (pane) when the inline edit surface opens/closes so it
     *  can drop its card chrome while editing. */
    onEditingChange?: (editing: boolean) => void;
};

/** "4× / week" style frequency label for the meta row. */
const frequencyMeta = (frequency: number, range: number): string => {
    if (frequency === range) return 'daily';
    const unit =
        range === 7 ? 'week' : range === 30 ? 'month' : range === 365 ? 'year' : `${range}d`;
    return `${frequency}× / ${unit}`;
};

/**
 * Shell-agnostic habit detail. Renders its own header row (name + meta +
 * Edit/Archive/Delete actions) and owns ALL data fetching, tracker/KPI/streak
 * optimism, and edit/delete modals. It never renders any page chrome so it
 * can be dropped into either the master-detail pane (wide) or the full-page cool
 * shell (narrow / deep-link).
 */
export const HabitDetailBody = ({
    habitId,
    onDeleted,
    compact = false,
    onEditingChange
}: HabitDetailBodyProps) => {
    // hooks
    const [habit, setHabit] = useState<HabitRead>();
    const [trackers, setTrackers] = useState<TrackerLite[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();

    // Per-profile display preferences (both default to the server defaults when
    // the profile record predates the flags).
    const { activeProfile } = useAuth();
    const weekStartMonday = activeProfile?.week_start_monday ?? true;
    const useHabitColorAccent = activeProfile?.use_habit_color_accent ?? false;

    // Let the host react to edit-mode (e.g. the pane drops its card chrome).
    useEffect(() => {
        onEditingChange?.(isEditing);
    }, [isEditing, onEditingChange]);

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
            onDeleted?.();
        }
    });

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onSuccess: async (data) => {
            // Optimistically update ALL tracker caches for this habit (any days value)
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: habit?.id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    // Only add if not already present
                    if (oldData.trackers.some((t) => t.id === data.id)) return oldData;
                    return {
                        ...oldData,
                        trackers: [...oldData.trackers, data]
                    };
                }
            );
            // Server persisted the tracker → reconcile KPIs/streaks from the server.
            invalidateKpiCaches();
        },
        onError: (error) => {
            console.error('Error adding tracker:', error);
        }
    });

    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onSuccess: async (data) => {
            // Optimistically update ALL tracker caches for this habit (any days value)
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: habit?.id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    return {
                        ...oldData,
                        trackers: oldData.trackers.map((t) => (t.id === data.id ? data : t))
                    };
                }
            );
            // Server persisted the change → reconcile KPIs/streaks from the server.
            invalidateKpiCaches();
        },
        onError: (error) => {
            console.error('Error updating tracker:', error);
        }
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

    // Effect to set habits from query data
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

    if (habitQuery.isLoading) {
        return (
            <div className='flex items-center justify-center py-16 font-mono text-[12px] text-text-muted'>
                Loading habit…
            </div>
        );
    }

    if (habitQuery.isError) {
        return (
            <div className='flex items-center justify-center py-16 font-mono text-[12px] text-[var(--color-danger)]'>
                Couldn’t load this habit.
            </div>
        );
    }

    const sinceLabel = habit
        ? parseLocalDate(habit.created_date.split('T')[0] ?? habit.created_date).toLocaleDateString(
              'en-US',
              {
                  month: 'short',
                  year: 'numeric'
              }
          )
        : '';

    const ghostButton =
        'inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors';

    // The detail view's accent, threaded to every child (KPI rings, streak bars,
    // weekday-chart fills, month-grid completed chips, note pips) as CSS custom
    // properties on the root element. With use_habit_color_accent ON the habit's
    // own color drives all of them (shades derived via color-mix); OFF keeps the
    // theme's fixed cool-blue values, matching the pre-flag rendering exactly.
    const habitAccent = useHabitColorAccent && habit?.color ? habit.color : null;
    const accentVars = {
        '--habit-detail-accent': habitAccent ?? '#6f9dc0',
        '--habit-detail-accent-bright': habitAccent
            ? `color-mix(in srgb, ${habitAccent} 70%, white)`
            : '#8fc0e0',
        '--habit-detail-accent-soft': habitAccent
            ? `color-mix(in srgb, ${habitAccent} 48%, #191d22)`
            : '#3f5a6b',
        '--habit-detail-accent-ring': habitAccent ?? '#7fa8c9',
        '--habit-detail-accent-ring-dim': habitAccent
            ? `color-mix(in srgb, ${habitAccent} 76%, #14181d)`
            : '#5f8aa8'
    } as CSSProperties;

    // Inline edit surface replaces the read view (mirrors the task editor pattern).
    if (isEditing && habit) {
        return (
            <>
                <HabitEditor
                    habit={habit}
                    isSaving={habitsEdit.isPending}
                    onDelete={() => setIsDeleteModalOpen(true)}
                    onCancel={() => setIsEditing(false)}
                    onSave={(update) =>
                        habitsEdit.mutate(
                            { id: habit.id, update },
                            { onSuccess: () => setIsEditing(false) }
                        )
                    }
                />
                {/* The delete confirm must be reachable from edit mode too — this
                    branch early-returns, so mount the modal here as well. */}
                <DeleteHabitModal
                    isOpen={isDeleteModalOpen}
                    habit={habit}
                    onClose={() => setIsDeleteModalOpen(false)}
                    handleDeleteHabit={() => habitsDelete.mutate(habit.id)}
                />
            </>
        );
    }

    return (
        <div className='flex flex-col gap-6' style={accentVars}>
            {/* Header: name + meta, with a lone Edit affordance top-right.
                No archive/delete on the name's axis — those live in the footer.
                In compact (pane) mode the pane floats a close (X) in the card's
                top-right corner, so pad the header to keep the name/Edit clear of it. */}
            <div className={`flex items-start justify-between gap-4 ${compact ? 'pr-10' : ''}`}>
                <div className='min-w-0'>
                    <h1 className='font-display text-[20px] font-bold tracking-[-0.01em] text-text-primary'>
                        {habit?.name}
                    </h1>
                    {habit && (
                        <div className='mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-[#8ba3b5]'>
                            <span
                                className='h-3 w-3 rounded-[4px]'
                                style={{ background: habit.color }}
                            />
                            <span>{frequencyMeta(habit.frequency, habit.range)}</span>
                            {habit.category && (
                                <>
                                    <span className='text-[#3a4a56]'>·</span>
                                    <span>{habit.category}</span>
                                </>
                            )}
                            <span className='text-[#3a4a56]'>·</span>
                            <span>since {sinceLabel}</span>
                        </div>
                    )}
                </div>
                <button
                    type='button'
                    onClick={() => setIsEditing(true)}
                    aria-label='Edit habit'
                    title='Edit habit'
                    className='shrink-0 rounded-button border p-1.5 text-text-secondary transition-colors hover:text-text-primary'
                    style={{ borderColor: 'var(--habit-container-border)' }}
                >
                    <Pencil size={14} />
                </button>
            </div>

            <KpiBoard kpis={kpisQuery.data} compact={compact} />

            <div
                className={
                    compact
                        ? 'flex flex-col gap-5'
                        : 'grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]'
                }
            >
                <CalendarBoard
                    habit={habit}
                    trackers={trackers}
                    weekStartMonday={weekStartMonday}
                    onTrackerCreate={handleTrackerCreate}
                    onTrackerUpdate={handleTrackerUpdate}
                />
                <div className='flex flex-col gap-5'>
                    <WeekdayChart
                        rates={kpisQuery.data?.weekday_completion_rates}
                        weekStartMonday={weekStartMonday}
                    />
                    <StreakChart streaks={streaksQuery.data ?? []} />
                </div>
            </div>

            {/* Footer: Archive / Delete, separated from the content by a hairline. */}
            {habit && (
                <div
                    className='flex items-center justify-end gap-1.5 border-t pt-4'
                    style={{ borderColor: 'var(--surface-card-border)' }}
                >
                    <button
                        type='button'
                        onClick={() =>
                            habitsEdit.mutate({
                                id: habit.id,
                                update: { archived: !habit.archived }
                            })
                        }
                        className={`${ghostButton} text-text-secondary hover:text-text-primary`}
                        style={{ borderColor: 'var(--habit-container-border)' }}
                    >
                        {habit.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                        {habit.archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                        type='button'
                        onClick={() => setIsDeleteModalOpen(true)}
                        className={`${ghostButton} hover:brightness-125`}
                        style={{
                            borderColor: 'var(--habit-container-border)',
                            color: 'var(--color-danger)'
                        }}
                    >
                        <Trash size={13} />
                        Delete
                    </button>
                </div>
            )}

            {habit && (
                <DeleteHabitModal
                    isOpen={isDeleteModalOpen}
                    habit={habit}
                    onClose={() => setIsDeleteModalOpen(false)}
                    handleDeleteHabit={() => habitsDelete.mutate(habit.id)}
                />
            )}
        </div>
    );
};
