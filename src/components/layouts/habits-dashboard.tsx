import type { HabitCreate, HabitRead } from '@/api';
import { TitleBar } from '@/components/ui/title-bar';
import { createHabit } from '@/features/habits/api/create-habits';
import { deleteHabit } from '@/features/habits/api/delete-habits';
import { getHabits } from '@/features/habits/api/get-habits';
import { AddHabitModal } from '@/features/habits/components/add-habit-modal';
import { HabitList } from '@/features/habits/components/dashboard/habit-list';
import { DeleteHabitModal } from '@/features/habits/components/delete-habit-modal';
import { LoadingStatus } from '@/types/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { LoadingScreen } from './loading-screen';

type HabitsDashboardProps = {
    days?: number;
};

export const HabitsDashboard = ({ days = 9 }: HabitsDashboardProps) => {
    const { user } = useAuth();
    const userId = user?.id || 1; // Fallback to 1 if no user (shouldn't happen in protected routes)
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
        mutationFn: createHabit,
        onSuccess: (data) => {
            setHabits((prev) => [...prev, data]);
            habitsQuery.refetch();
        }
    });

    const habitsDelete = useMutation({
        mutationFn: deleteHabit,
        onSuccess: (_data, habitId) => {
            setHabits((prev) => prev.filter((item) => item.id !== habitId));
            habitsQuery.refetch();
        }
    });

    const handleAddHabit = (newHabit: HabitCreate) =>
        habitsAdd.mutate(newHabit);

    const handleDeleteHabit = (habit: HabitRead) => {
        if (habit) habitsDelete.mutate(habit.id);
    };

    // Effect to set habits from query data
    useEffect(() => {
        if (habitsQuery.data?.habits) {
            setHabits(habitsQuery.data.habits);
        }
    }, [habitsQuery.data]);

    if (habitsQuery.isLoading) {
        return <LoadingScreen />;
    }

    if (habitsQuery.isError) {
        console.log('Error loading habits:', habitsQuery.error);
    }

    return (
        <div className='static'>
            <TitleBar onAddHabitClick={() => setAddHabitModalOpen(true)} />
            <HabitList
                habits={habits}
                days={days}
                onHabitDeleteClick={(habit) => {
                    setDeleteHabitModalOpen(true);
                    setSelectedHabit(habit);
                }}
            />
            <AddHabitModal
                isOpen={addHabitModalOpen}
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
                    handleDeleteHabit={(habit: HabitRead) =>
                        handleDeleteHabit(habit)
                    }
                />
            )}
        </div>
    );
};
