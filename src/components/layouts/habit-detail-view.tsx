import type { HabitRead, HabitUpdate } from '@/api';
import { deleteHabit } from '@/features/habits/api/delete-habits';
import {
    getHabit,
    getHabitKPIs,
    getHabitStreaks
} from '@/features/habits/api/get-habits';
import { updateHabit } from '@/features/habits/api/update-habits';
import { CalendarBoard } from '@/features/habits/components/details/calendar-board';
import { KpiBoard } from '@/features/habits/components/details/kpi-board';
import { AddHabitModal } from '@/features/habits/components/modals/add-habit-modal';
import { DeleteHabitModal } from '@/features/habits/components/modals/delete-habit-modal';
import { getFrequencyString } from '@/lib/date-utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Archive,
    ArchiveRestore,
    Bell,
    Calendar,
    CalendarPlus,
    Pencil,
    Trash
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
    const [habit, setHabit] = useState<HabitRead>();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const habitQuery = useQuery({
        queryKey: ['habit', { habitId }],
        queryFn: () => getHabit(habitId),
        staleTime: 1000 * 60 // 1 minute
    });
    const habitKPIQuery = useQuery({
        queryKey: ['habit-kpis', { habitId }],
        queryFn: () => getHabitKPIs(habitId),
        enabled: !!habitId
    });
    const streakQuery = useQuery({
        queryKey: ['habit-streaks', { habitId }],
        queryFn: () => getHabitStreaks(habitId),
        enabled: !!habitId
    });

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
                        habits: oldData.habits.map((h) =>
                            h.id === data.id ? data : h
                        )
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
                        habits: oldData.habits.filter(
                            (h) => h.id !== deletedHabitId
                        )
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

    // Effect to set habits from query data
    useEffect(() => {
        if (habitQuery.data !== undefined) {
            setHabit(habitQuery.data);
        }
    }, [habitQuery.data]);

    if (habitQuery.isLoading) {
        return <LoadingScreen />;
    }

    if (habitQuery.isError) {
        return <ErrorScreen message='Error Loading habit query data' />;
    }

    const freqStr = habit
        ? getFrequencyString(habit.frequency, habit.range)
        : '';
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
                        icon: (
                            <Calendar size={16} className='inline-flex mr-1' />
                        )
                    },
                    {
                        text: `Created: ${
                            habit
                                ? new Date(
                                      habit.created_date
                                  ).toLocaleDateString()
                                : ''
                        }`,
                        icon: (
                            <CalendarPlus
                                size={16}
                                className='inline-flex mr-1'
                            />
                        )
                    },
                    {
                        text: reminderStatus,
                        icon: <Bell size={16} className='inline-flex mr-1' />
                    }
                ]}
            />
            <KpiBoard habitKPIS={habitKPIQuery.data} />
            <CalendarBoard habit={habit} />
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
