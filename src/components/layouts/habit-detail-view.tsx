import type { HabitRead } from '@/api';
import { getHabit } from '@/features/habits/api/get-habits';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { TitleBar } from '../ui/title-bar';
import { useAuth } from '@/lib/auth-context';

type HabitDetailViewProps = {
    habitId?: number;
};

export const HabitDetailView = ({ habitId }: HabitDetailViewProps) => {
    const { user } = useAuth();
    const [habit, setHabit] = useState<HabitRead>();
    const habitQuery = useQuery({
        queryKey: ['habit', { habitId }],
        queryFn: () => getHabit(habitId),
        staleTime: 1000 * 60 // 1 minute
    });

    // Effect to set habits from query data
    useEffect(() => {
        if (habitQuery.data !== undefined) {
            setHabit(habitQuery.data);
        }
    }, [habitQuery.data]);

    if (habitQuery.isLoading) {
        return (
            <>
                <TitleBar title='Loading...' />
            </>
        );
    }

    if (habitQuery.isError) {
        return (
            <>
                <TitleBar title='Error loading habit' />
                <Link to='/'>Click here to return to dashboard page</Link>
            </>
        );
    }

    return (
        <>
            <TitleBar title={`${habit?.name}`} />
            <p>
                Habit: {habitId}
                Habit Name: {habit?.name}
            </p>
        </>
    );
};
