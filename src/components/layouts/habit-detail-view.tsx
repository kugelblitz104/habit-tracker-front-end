import type { HabitRead, HabitUpdate, TrackerCreate, TrackerRead, TrackerUpdate } from '@/api';
import { deleteHabit } from '@/features/habits/api/delete-habits';
import { getHabit } from '@/features/habits/api/get-habits';
import { updateHabit } from '@/features/habits/api/update-habits';
import { CalendarBoard } from '@/features/habits/components/details/calendar-board';
import { KpiBoard } from '@/features/habits/components/details/kpi-board';
import { StreakChart } from '@/features/habits/components/details/streak-chart';
import { AddHabitModal } from '@/features/habits/components/modals/add-habit-modal';
import { DeleteHabitModal } from '@/features/habits/components/modals/delete-habit-modal';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackers } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { calculateKPIsFromTrackers, calculateStreaks } from '@/features/trackers/utils/kpi-utils';
import { getFrequencyString, getWeeksDifference } from '@/lib/date-utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Bell, Calendar, CalendarPlus, Pencil, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ButtonVariant } from '../ui/buttons/action-button';
import { SubtitleBar } from '../ui/subtitle-bar';
import { TitleBar, type ActionConfig } from '../ui/title-bar';
import { ErrorScreen } from './error-screen';
import { LoadingScreen } from './loading-screen';

type HabitDetailViewProps = {
    habitId?: number;
};

export const HabitDetailView = ({ habitId }: HabitDetailViewProps) => {
    // hooks
    const [habit, setHabit] = useState<HabitRead>();
    const [trackers, setTrackers] = useState<TrackerRead[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // constants
    const weeksSinceCreated = habit?.created_date ? getWeeksDifference(habit.created_date) : 10;
    const WEEKS = Math.max(10, weeksSinceCreated);
    const DAYS_PER_WEEK = 7;
    const TOTAL_DAYS = Math.min(1000, WEEKS * DAYS_PER_WEEK);

    // queries
    const habitQuery = useQuery({
        queryKey: ['habit', { habitId }],
        queryFn: () => getHabit(habitId),
        staleTime: 1000 * 60 // 1 minute
    });

    const trackersQuery = useQuery({
        queryKey: ['trackers', { habitId: habit?.id }, TOTAL_DAYS],
        queryFn: () => getTrackers(habit!.id, TOTAL_DAYS),
        enabled: !!habit,
        staleTime: 1000 * 60
    });

    // Calculate KPIs from trackers on the frontend
    const habitKPIs = useMemo(() => {
        if (!habit || trackers.length === 0) return undefined;
        return calculateKPIsFromTrackers(habit, trackers);
    }, [habit, trackers]);

    const habitStreaks = useMemo(() => {
        if (!habit || trackers.length === 0) return undefined;
        return calculateStreaks(trackers, habit.frequency, habit.range, habit.created_date);
    }, [habit, trackers]);

    // mutations
    const habitsEdit = useMutation({
        mutationFn: ({ id, update }: { id: number; update: HabitUpdate }) =>
            updateHabit(id, update),
        onSuccess: (data) => {
            setHabit(data);
            // Update the individual habit cache
            queryClient.setQueryData(['habit', { habitId }], data);
            // Optimistically update the habits list cache
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
                queryKey: ['trackers', { habitId: deletedHabitId }]
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
        return new Promise((resolve, reject) => {
            trackerCreate.mutate(tracker, {
                onSuccess: (data) => {
                    setTrackers((prev) => [...prev, data]);
                    resolve(data);
                },
                onError: (error) => reject(error)
            });
        });
    };

    const handleTrackerUpdate = async (id: number, update: TrackerUpdate): Promise<TrackerRead> => {
        return new Promise((resolve, reject) => {
            trackerUpdate.mutate(
                { id, update },
                {
                    onSuccess: (data) => {
                        setTrackers((prev) => prev.map((t) => (t.id === data.id ? data : t)));
                        resolve(data);
                    },
                    onError: (error) => reject(error)
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

    // Effect to set trackers from query data
    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    if (habitQuery.isLoading) {
        return <LoadingScreen />;
    }

    if (habitQuery.isError) {
        return <ErrorScreen message='Error Loading habit query data' />;
    }

    const freqStr = habit ? getFrequencyString(habit.frequency, habit.range) : '';
    const reminderStatus = habit ? (habit.reminder ? 'on' : 'off') : '';

    const titleBarActions = [
        {
            label: 'Delete',
            onClick: () => setIsDeleteModalOpen(true),
            icon: <Trash />,
            variant: ButtonVariant.Danger
        },
        {
            label: 'Edit',
            onClick: () => setIsEditModalOpen(true),
            icon: <Pencil />,
            variant: ButtonVariant.Secondary
        },
        habit && {
            label: habit.archived ? 'Unarchive' : 'Archive',
            onClick: () =>
                habitsEdit.mutate({
                    id: habit.id,
                    update: { archived: !habit.archived }
                }),
            icon: habit.archived ? <ArchiveRestore /> : <Archive />,
            variant: ButtonVariant.Secondary
        }
    ].filter(Boolean) as ActionConfig[];

    return (
        <>
            <TitleBar title={`${habit?.name}`} actions={titleBarActions} />
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
                        text: `Created: ${habit ? habit.created_date : ''}`,
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
                trackers={trackers}
                totalDays={TOTAL_DAYS}
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
        </>
    );
};
