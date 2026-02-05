import type { HabitCreate, HabitRead } from '@/api';
import { createHabit } from '@/features/habits/api/create-habits';
import { getHabits } from '@/features/habits/api/get-habits';
import { HabitList } from '@/features/habits/components/dashboard/habit-list';
import { AddHabitModal } from '@/features/habits/components/modals/add-habit-modal';
import { SortHabitModal } from '@/features/habits/components/modals/sort-habit-modal';
import { useAuth } from '@/lib/auth-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDownUp, Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { ButtonVariant } from '../ui/buttons/action-button';
import { ErrorPage } from './error-page';
import { LoadingPage } from './loading-page';
import { sortHabits } from '@/features/habits/api/update-habits';
import { PageShell } from '../ui/page-shell';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

const useResponsiveLayout = () => {
    const isXl = useMediaQuery({ minWidth: 1280 });
    const isLg = useMediaQuery({ minWidth: 1024 });
    const isMd = useMediaQuery({ minWidth: 768 });

    let days: number;
    switch (true) {
        case isXl:
            days = 14;
            break;
        case isLg:
            days = 11;
            break;
        case isMd:
            days = 8;
            break;
        default:
            days = 4;
    }

    return { days, isSmall: !isMd };
};

export const HabitsDashboard = () => {
    const { days, isSmall } = useResponsiveLayout();
    const navigate = useNavigate();
    const { user } = useAuth();
    const userId = user?.id || 0; // Fallback to non-existent user ID

    // hooks
    const [habits, setHabits] = useState<HabitRead[]>([]);
    const [addHabitModalOpen, setAddHabitModalOpen] = useState(false);
    const [sortModalOpen, setSortModalOpen] = useState(false);
    const habitsQuery = useQuery({
        queryKey: ['habits', { userId }],
        queryFn: () => getHabits(userId),
        staleTime: 1000 * 60 // 1 minute
    });

    const habitsAdd = useMutation({
        mutationFn: createHabit,
        onSuccess: (data) => {
            setHabits((prev) => [...prev, data]);
            habitsQuery.refetch();
            toast.success('Habit added successfully!');
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
        return <ErrorPage message='User not authenticated' />;
    }

    if (habitsQuery.isLoading) {
        return <LoadingPage />;
    }

    if (habitsQuery.isError) {
        return <ErrorPage message='Error loading habits' />;
    }

    return (
        <PageShell
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
                },
                {
                    label: 'Settings',
                    onClick: () => {
                        navigate('/settings');
                    },
                    icon: <Settings size={24} />,
                    variant: ButtonVariant.Secondary
                }
            ]}
        >
            <div className='static'>
                <HabitList habits={habits} days={days} isSmall={isSmall} />
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
        </PageShell>
    );
};
