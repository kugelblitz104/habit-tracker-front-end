import type { HabitCreate, HabitRead } from '@/api';
import { TitleBar } from '@/components/ui/title-bar';
import { createHabit } from '@/features/habits/api/create-habits';
import { getHabits } from '@/features/habits/api/get-habits';
import { HabitList } from '@/features/habits/components/dashboard/habit-list';
import { AddHabitModal } from '@/features/habits/components/modals/add-habit-modal';
import { SortHabitModal } from '@/features/habits/components/modals/sort-habit-modal';
import { useAuth } from '@/lib/auth-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDownUp, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { ButtonVariant } from '../ui/buttons/action-button';
import { ErrorScreen } from './error-screen';
import { LoadingScreen } from './loading-screen';
import { sortHabits } from '@/features/habits/api/update-habits';

const useResponsiveDays = () => {
    const isXl = useMediaQuery({ minWidth: 1280 });
    const isLg = useMediaQuery({ minWidth: 1024 });
    const isMd = useMediaQuery({ minWidth: 768 });

    switch (true) {
        case isXl:
            return 14;
        case isLg:
            return 11;
        case isMd:
            return 8;
        default:
            return 4;
    }
};

export const HabitsDashboard = () => {
    const days = useResponsiveDays();
    const { user } = useAuth();
    const userId = user?.id || 0; // Fallback to non-existent user ID

    // hooks
    const [habits, setHabits] = useState<HabitRead[]>([]);
    const [addHabitModalOpen, setAddHabitModalOpen] = useState(false);
    const [sortModalOpen, setSortModalOpen] = useState(false);
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

    const habitsSort = useMutation({
        mutationFn: sortHabits,
        onSuccess: () => {
            habitsQuery.refetch();
        }
    });

    // Effect to set habits from query data
    useEffect(() => {
        if (habitsQuery.data?.habits) {
            setHabits(habitsQuery.data.habits);
        }
    }, [habitsQuery.data]);

    if (!user) {
        return <ErrorScreen message='User not authenticated' />;
    }

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
                        icon: <Plus size={24} />,
                        variant: ButtonVariant.Primary
                    },
                    {
                        label: 'Set Habit Order',
                        onClick: () => setSortModalOpen(true),
                        icon: <ArrowDownUp size={24} />,
                        variant: ButtonVariant.Secondary
                    }
                ]}
            />
            <HabitList habits={habits} days={days} />
            <AddHabitModal
                isOpen={addHabitModalOpen}
                onClose={() => setAddHabitModalOpen(false)}
                handleAddHabit={(newHabit: HabitCreate) => habitsAdd.mutate(newHabit)}
            />
            <SortHabitModal
                key={sortModalOpen ? 'open' : 'closed'} // Force remount to reset state
                isOpen={sortModalOpen}
                onClose={() => setSortModalOpen(false)}
                handleSortHabits={(reorderedHabits: HabitRead[]) =>
                    habitsSort.mutate(reorderedHabits.map((h) => h.id))
                }
                habits={habits}
            />
        </div>
    );
};
