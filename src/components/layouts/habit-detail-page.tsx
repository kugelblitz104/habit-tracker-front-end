import type {
    HabitRead,
    HabitUpdate,
    TrackerCreate,
    TrackerLite,
    TrackerRead,
    TrackerUpdate
} from '@/api';
import { deleteHabit } from '@/features/habits/api/delete-habits';
import { getHabit } from '@/features/habits/api/get-habits';
import { updateHabit } from '@/features/habits/api/update-habits';
import { CalendarBoard } from '@/features/habits/components/details/calendar-board';
import { KpiBoard } from '@/features/habits/components/details/kpi-board';
import { StreakChart } from '@/features/habits/components/details/streak-chart';
import { AddHabitModal } from '@/features/habits/components/modals/add-habit-modal';
import { DeleteHabitModal } from '@/features/habits/components/modals/delete-habit-modal';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { calculateKPIsFromTrackers, calculateStreaks } from '@/features/trackers/utils/kpi-utils';
import { getFrequencyString, toLocalDateString } from '@/lib/date-utils';
import { WEEKS_BY_SIZE, useResponsiveLayout } from '@/lib/use-responsive-layout';
import { TrackerStatus } from '@/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Bell, Calendar, CalendarPlus, Pencil, Trash } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { ButtonVariant } from '../ui/buttons/action-button';
import { PageShell } from '../ui/page-shell';
import { SubtitleBar } from '../ui/subtitle-bar';
import { type ActionConfig } from '../ui/title-bar';
import { ErrorPage } from './error-page';
import { LoadingPage } from './loading-page';

type HabitDetailViewProps = {
    habitId?: number;
};

export const HabitDetailView = ({ habitId }: HabitDetailViewProps) => {
    // hooks
    const [habit, setHabit] = useState<HabitRead>();
    const [trackers, setTrackers] = useState<TrackerLite[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Responsive layout for calendar weeks
    const layoutSize = useResponsiveLayout();
    const weeks = WEEKS_BY_SIZE[layoutSize];
    const days = weeks * 7;

    // Days from habit creation to today – used to fetch full tracker history for KPIs
    const allTrackersDays = useMemo(() => {
        if (!habit?.created_date) return 365;
        const created = new Date(habit.created_date);
        const today = new Date();
        const diff = Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(diff, days);
    }, [habit?.created_date, days]);

    // Pagination state - endDate defaults to today
    const [endDate, setEndDate] = useState<string>(() => toLocalDateString(new Date()));

    // Handler for page changes from CalendarBoard
    const handlePageChange = useCallback((newEndDate: string) => {
        setEndDate(newEndDate);
    }, []);

    // queries
    const habitQuery = useQuery({
        queryKey: ['habit', { habitId }],
        queryFn: () => getHabit(habitId),
        staleTime: 1000 * 60 // 1 minute
    });

    // Fetch the full tracker history once (habit creation → today).
    // The calendar window is derived from this data via useMemo below.
    const trackersQuery = useQuery({
        queryKey: ['trackers-lite', { habitId: habit?.id, allTrackersDays }],
        queryFn: () => getTrackersLite(habit!.id, toLocalDateString(new Date()), allTrackersDays),
        enabled: !!habit,
        staleTime: 1000 * 60
    });

    // Derive the calendar window by filtering the full history to [endDate - days, endDate]
    const windowTrackers = useMemo(() => {
        if (!trackers.length) return [];
        const windowEnd = endDate;
        const windowStartDate = new Date(endDate + 'T00:00:00');
        windowStartDate.setDate(windowStartDate.getDate() - days + 1);
        const windowStart = toLocalDateString(windowStartDate);
        return trackers.filter((t) => t.dated >= windowStart && t.dated <= windowEnd);
    }, [trackers, endDate, days]);

    // The calendar can page back as long as the habit existed before the current window
    const hasPrevious = useMemo(() => {
        if (!habit?.created_date) return false;
        const windowStart = new Date(endDate + 'T00:00:00');
        windowStart.setDate(windowStart.getDate() - days + 1);
        return new Date(habit.created_date) < windowStart;
    }, [habit?.created_date, endDate, days]);

    // Calculate KPIs from the full tracker history so KPIs always reflect all data
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
            navigate('/', { replace: true });
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

        // Optimistically add to the full history; the calendar window derives automatically
        setTrackers((prev) =>
            prev.some((t) => t.dated === optimisticTracker.dated)
                ? prev
                : [...prev, optimisticTracker]
        );

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
                    setTrackers((prev) => prev.map((t) => (t.id === tempId ? trackerLite : t)));
                    resolve(data);
                },
                onError: (error) => {
                    // Rollback
                    setTrackers((prev) => prev.filter((t) => t.id !== tempId));
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

        // Optimistically update the full history; the calendar window derives automatically
        setTrackers((prev) => prev.map(applyUpdate));

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
                        setTrackers((prev) =>
                            prev.map((t) => (t.id === data.id ? trackerLite : t))
                        );
                        resolve(data);
                    },
                    onError: (error) => {
                        // Rollback
                        setTrackers(previousTrackers);
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

    if (habitQuery.isLoading) {
        return <LoadingPage />;
    }

    if (habitQuery.isError) {
        return <ErrorPage message='Error Loading habit query data' />;
    }

    const freqStr = habit ? getFrequencyString(habit.frequency, habit.range) : '';
    const reminderStatus = habit ? (habit.reminder ? 'on' : 'off') : '';

    const titleBarActions = [
        {
            label: 'Edit',
            onClick: () => setIsEditModalOpen(true),
            icon: <Pencil size={20} />,
            variant: ButtonVariant.Secondary
        },
        habit && {
            label: habit.archived ? 'Unarchive' : 'Archive',
            onClick: () =>
                habitsEdit.mutate({
                    id: habit.id,
                    update: { archived: !habit.archived }
                }),
            icon: habit.archived ? <ArchiveRestore size={20} /> : <Archive size={20} />,
            variant: ButtonVariant.Secondary
        },
        {
            label: 'Delete',
            onClick: () => setIsDeleteModalOpen(true),
            icon: <Trash size={20} />,
            variant: ButtonVariant.Danger
        }
    ].filter(Boolean) as ActionConfig[];

    return (
        <PageShell title={`${habit?.name}`} actions={titleBarActions}>
            <SubtitleBar
                subtitles={[
                    {
                        text: habit?.question || '',
                        color: habit?.color,
                        bold: true
                    },
                    {
                        text: freqStr,
                        icon: <Calendar size={16} className='inline-flex mr-1' />
                    },
                    {
                        text: `Created: ${habit ? habit.created_date.split('T')[0] : ''}`,
                        icon: <CalendarPlus size={16} className='inline-flex mr-1' />
                    },
                    {
                        text: reminderStatus,
                        icon: <Bell size={16} className='inline-flex mr-1' />
                    }
                ]}
            />
            <KpiBoard habitKPIS={habitKPIs} />
            <CalendarBoard
                habit={habit}
                trackers={windowTrackers}
                weeks={weeks}
                endDate={endDate}
                hasPrevious={hasPrevious}
                isLoading={trackersQuery.isLoading}
                onPageChange={handlePageChange}
                onTrackerCreate={handleTrackerCreate}
                onTrackerUpdate={handleTrackerUpdate}
            />
            <StreakChart streaks={habitStreaks || []} color={habit?.color} />
            {habit && (
                <DeleteHabitModal
                    isOpen={isDeleteModalOpen}
                    habit={habit}
                    onClose={() => setIsDeleteModalOpen(false)}
                    handleDeleteHabit={() => habitsDelete.mutate(habit.id)}
                />
            )}
            {habit && (
                <AddHabitModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    habit={habit}
                    handleAddHabit={(updatedHabit: HabitUpdate) => {
                        if (habit?.id) {
                            habitsEdit.mutate({
                                id: habit.id,
                                update: updatedHabit
                            });
                        }
                    }}
                />
            )}
        </PageShell>
    );
};
