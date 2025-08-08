import { HabitList } from '@/features/habits/components/habit-list';
import { TitleBar } from '@/components/ui/title-bar';
import { LoadingStatus, type Habit, type HabitCreate } from '@/types/types';
import { useEffect, useState } from 'react';
import { getHabits } from '@/features/habits/api/get-habits';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createHabit } from '@/features/habits/api/create-habits';
import { AddHabitModal } from '@/features/habits/components/add-habit-modal';


type HabitsDashboardProps = {
    userId: number;
    days?: number;
}

export const HabitsDashboard = ({ 
    userId,
    days = 10
}: HabitsDashboardProps) => {
    // hooks
    const [habits, setHabits] = useState<Habit[]>([]);
    const [addHabitModalOpen, setAddHabitModalOpen] = useState(false);
    const habitsQuery = useQuery ({
        queryKey: ['habits', { userId }],
        queryFn: () => getHabits(userId, days),
        staleTime: 1000 * 60, // 1 minute
    });

    const habitsAdd = useMutation({
        mutationFn: (newHabit: HabitCreate) => createHabit(newHabit),
        onSuccess: () => {
            habitsQuery.refetch();
        }
    });

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
    }

    // Effect to set habits from query data
    useEffect(() => {
        if (habitsQuery.data?.habits !== undefined) {
            setHabits(habitsQuery.data.habits);
        }
    }, [habitsQuery.data?.habits]);

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
            />
            <AddHabitModal 
                isOpen={addHabitModalOpen} 
                userId={userId}
                onClose={() => setAddHabitModalOpen(false)} 
                handleAddHabit={(newHabit: HabitCreate) => {
                    habitsAdd.mutate(newHabit, {
                        onSuccess: (data) => {setHabits([...habits, data])}
                    })
                }}
            />
        </div>
    );
}