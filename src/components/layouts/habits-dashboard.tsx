import type { HabitCreate, HabitRead } from '@/api';
import { TitleBar } from '@/components/ui/title-bar';
import { createHabit } from '@/features/habits/api/create-habits';
import { getHabits } from '@/features/habits/api/get-habits';
import { HabitList } from '@/features/habits/components/dashboard/habit-list';
import { AddHabitModal } from '@/features/habits/components/modals/add-habit-modal';
import { useAuth } from '@/lib/auth-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ButtonVariant } from '../ui/buttons/action-button';
import { LoadingScreen } from './loading-screen';
import { ErrorScreen } from './error-screen';

type HabitsDashboardProps = {
    days?: number;
};

export const HabitsDashboard = ({ days = 9 }: HabitsDashboardProps) => {
    const { user } = useAuth();
    const userId = user?.id || 1; // Fallback to 1 if no user (shouldn't happen in protected routes)
    // hooks
    const [habits, setHabits] = useState<HabitRead[]>([]);
    const [addHabitModalOpen, setAddHabitModalOpen] = useState(false);
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
        return <ErrorScreen message='Error loading habits' />;
    }

    return (
        <div className='static'>
            <TitleBar
                actions={[
                    {
                        label: 'Add Habit',
                        onClick: () => setAddHabitModalOpen(true),
                        icon: <Plus />,
                        variant: ButtonVariant.Primary
                    }
                ]}
            />
            <HabitList habits={habits} days={days} />
            <AddHabitModal
                isOpen={addHabitModalOpen}
                onClose={() => setAddHabitModalOpen(false)}
                handleAddHabit={(newHabit: HabitCreate) =>
                    habitsAdd.mutate(newHabit)
                }
            />
        </div>
    );
};
