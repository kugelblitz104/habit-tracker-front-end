import { useQuery } from "@tanstack/react-query";
import { getHabits} from "@/features/habits/api/get-habits";
import { HabitListElement } from "./habit-list-element";

export type HabitListProps = {
    userId: number;
    days?: number; 
}

// TODO: context to hold number of days?

export const HabitList = ({
    userId,
    days = 7
}: HabitListProps) => {
    const habitsQuery = useQuery ({
        queryKey: ['habits', { userId }],
        queryFn: () => getHabits(userId),
        staleTime: 1000 * 60, // 1 minute
    });

    if (habitsQuery.isLoading) {
        return <div>Loading...</div>;
    }

    const habits = habitsQuery.data?.habits;
    if (habitsQuery.isError) {
        return <div>Error loading habits: {habitsQuery.error.message}</div>;
    }

    if (!habits || habits.length === 0) {
        return <div>No habits found.</div>;
    }

    return (
        <div className='overflow-x-auto'>
            <thead>
                <tr>
                    <th>Habit</th>
                    {
                        Array.from({ length: days }, (_, i) => (
                            <th key={i}>
                                Day {i + 1}
                            </th>
                        ))
                    }
                </tr>
            </thead>
            <tbody>
                {habits.map((habit) => (
                    <HabitListElement 
                        key={habit.id} 
                        habit={habit} 
                        days={days}
                    />
                ))}
            </tbody>
        </div>
    );
};