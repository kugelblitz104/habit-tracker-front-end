import { HabitList } from "@/features/habits/components/habit-list";
import { TitleBar } from "@/components/ui/title-bar";
import { LoadingStatus, type Habit } from "@/types/types";
import { useEffect, useState } from "react";
import { getHabits } from "@/features/habits/api/get-habits";
import { updateHabit } from "@/features/habits/api/update-habits";
import { useMutation, useQuery } from "@tanstack/react-query";


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
    const habitsQuery = useQuery ({
        queryKey: ['habits', { userId }],
        queryFn: () => getHabits(userId, days),
        staleTime: 1000 * 60, // 1 minute
    });
    const habitsUpdate = useMutation({
        mutationFn: (updatedHabit: Habit) => updateHabit(updatedHabit),
        onSuccess: () => {
            habitsQuery.refetch();
        }
    });
    

    // functions
    const handleHabitUpdate = (habit: Habit) => {
        habitsUpdate.mutate(habit, {
            onSuccess: (data) => {
                setHabits(habits.map(h => h.id === data.habit.id ? data.habit : h));
            }
        });
    };

    // Effect to set habits from query data
    useEffect(() => {
        if (habitsQuery.data?.habits !== undefined) {
            setHabits(habitsQuery.data.habits);
        }
    }, [habitsQuery.data?.habits]);

    if (habitsQuery.isError) {
        console.log("Error loading habits:", habitsQuery.error);
    }

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
    
    return (
        <>
            <TitleBar />
            <HabitList habits={habits} loadingStatus={loadingStatusToEnum(habitsQuery.status)} days={days} />
        </>
    );
}