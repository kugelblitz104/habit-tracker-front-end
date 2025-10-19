import { HabitList } from '@/features/habits/components/habit-list';
import { TitleBar } from '@/components/ui/title-bar';
import { LoadingStatus } from '@/types/types';
import type { HabitRead, HabitCreate } from '@/api';
import { useEffect, useState } from 'react';
import { getHabits } from '@/features/habits/api/get-habits';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createHabit } from '@/features/habits/api/create-habits';
import { AddHabitModal } from '@/features/habits/components/add-habit-modal';
import { deleteHabit } from '@/features/habits/api/delete-habits';
import { DeleteHabitModal } from '@/features/habits/components/delete-habit-modal';

type HabitsDashboardProps = {
    userId: number;
    days?: number;
};

export const HabitsDashboard = ({ userId, days = 9 }: HabitsDashboardProps) => {
    // hooks
    const [habits, setHabits] = useState<HabitRead[]>([]);
    const [addHabitModalOpen, setAddHabitModalOpen] = useState(false);
    const [deleteHabitModalOpen, setDeleteHabitModalOpen] = useState(false);
    const [selectedHabit, setSelectedHabit] = useState<HabitRead | null>(null);
    const habitsQuery = useQuery({
        queryKey: ['habits', { userId }],
        queryFn: () => getHabits(userId, days),
        staleTime: 1000 * 60 // 1 minute
    });

    const habitsAdd = useMutation({
        mutationFn: (newHabit: HabitCreate) => createHabit(newHabit),
        onSuccess: () => {
            habitsQuery.refetch();
        }
    });

    const habitsDelete = useMutation({
        mutationFn: (habitId: number) => deleteHabit(habitId),
        onSuccess: () => {
            habitsQuery.refetch();
        }
    });

    const handleAddHabit = (newHabit: HabitCreate) =>
        habitsAdd.mutate(newHabit, {
            onSuccess: (data) => {
                setHabits([...habits, data]);
            }
        });

    const handleDeleteHabit = (habit: HabitRead) => {
        if (!habit) return;
        habitsDelete.mutate(habit.id, {
            onSuccess: () => {
                setHabits(habits.filter((item) => item.id !== habit.id));
            }
        });
    };

    const loadingStatusToEnum = (status: string) => {
        switch (status) {
            case 'loading':
                return LoadingStatus.PENDING;
            case 'error':
                return LoadingStatus.ERROR;
            case 'success':
                return LoadingStatus.SUCCESS;
            default:
                return LoadingStatus.PENDING;
        }
    };

    // Effect to set habits from query data
    useEffect(() => {
        if (habitsQuery.data?.habits) {
            setHabits(habitsQuery.data.habits);
        }
    }, [habitsQuery.data]);

    if (habitsQuery.isError) {
        console.log('Error loading habits:', habitsQuery.error);
    }

    return (
        <div className='static'>
            <TitleBar onAddHabitClick={() => setAddHabitModalOpen(true)} />
            <HabitList
                habits={habits}
                loadingStatus={loadingStatusToEnum(habitsQuery.status)}
                days={days}
                onHabitDeleteClick={(habit) => {
                    setDeleteHabitModalOpen(true);
                    setSelectedHabit(habit);
                }}
            />
            <AddHabitModal
                isOpen={addHabitModalOpen}
                userId={userId}
                onClose={() => setAddHabitModalOpen(false)}
                handleAddHabit={(newHabit: HabitCreate) =>
                    handleAddHabit(newHabit)
                }
            />
            {selectedHabit && (
                <DeleteHabitModal
                    isOpen={deleteHabitModalOpen}
                    habit={selectedHabit}
                    onClose={() => setDeleteHabitModalOpen(false)}
                    handleDeleteHabit={(habit: HabitRead) => handleDeleteHabit(habit)}
                />
            )}
        </div>
    );
};
