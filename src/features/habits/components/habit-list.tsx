import { useQuery } from "@tanstack/react-query";
import { getHabits} from "@/features/habits/api/get-habits";
import { HabitListElement } from "./habit-list-element";

export type HabitListProps = {
    userId: number;
}

// TODO: context to hold number of days?

export const HabitList = ({
    userId,
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
        <div>
            <ul>
                {habits.map((habit) => (
                    <HabitListElement key={habit.id} habit={habit} days={30}/>
                ))}
            </ul>
        </div>
    );
};