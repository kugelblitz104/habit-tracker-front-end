import type { HabitRead } from '@/api';
import { deleteHabit } from '@/features/habits/api/delete-habits';
import {
    getHabit,
    getHabitKPIs,
    getHabitStreaks
} from '@/features/habits/api/get-habits';
import { KpiBoard } from '@/features/habits/components/details/kpi-board';
import { DeleteHabitModal } from '@/features/habits/components/modals/delete-habit-modal';
import { getFrequencyString } from '@/lib/date-utils';
import { useQuery } from '@tanstack/react-query';
import { Bell, Calendar, Pencil, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ButtonVariant } from '../ui/buttons/action-button';
import { TitleBar } from '../ui/title-bar';
import { ErrorScreen } from './error-screen';
import { LoadingScreen } from './loading-screen';

type HabitDetailViewProps = {
    habitId?: number;
};

export const HabitDetailView = ({ habitId }: HabitDetailViewProps) => {
    const [habit, setHabit] = useState<HabitRead>();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const navigate = useNavigate();
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

    return (
        <>
            <TitleBar
                title={`${habit?.name}`}
                actions={[
                    {
                        label: 'Delete',
                        onClick: () => setIsDeleteModalOpen(true),
                        icon: <Trash />,
                        variant: ButtonVariant.Danger
                    },
                    {
                        label: 'Edit',
                        onClick: () => {},
                        icon: <Pencil />,
                        variant: ButtonVariant.Secondary
                    }
                ]}
            />
            <div className='flex bg-slate-800 p-4 gap-4 text-sm items-center'>
                <span
                    className={'font-semibold'}
                    style={{ color: habit?.color }}
                >
                    {habit?.question}
                </span>
                <span className='flex items-center'>
                    <Calendar size={16} className='inline-flex mr-1' />
                    {habit && getFrequencyString(habit.frequency, habit.range)}
                </span>
                <span className='flex items-center'>
                    <Bell size={16} className='inline-flex mr-1' />
                    {habit && (habit.reminder ? 'on' : 'off')}
                </span>
            </div>
            <KpiBoard habitKPIS={habitKPIQuery.data} />
            {habit && (
                <DeleteHabitModal
                    isOpen={isDeleteModalOpen}
                    habit={habit}
                    onClose={() => setIsDeleteModalOpen(false)}
                    handleDeleteHabit={() => {
                        deleteHabit(habit.id).then(() => {
                            setIsDeleteModalOpen(false);
                            // Redirect to dashboard or another page after deletion
                            navigate('/', { replace: true });
                        });
                    }}
                />
            )}
        </>
    );
};
