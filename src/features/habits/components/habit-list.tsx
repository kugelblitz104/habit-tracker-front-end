import { useQuery } from "@tanstack/react-query";
import { getHabits} from "@/features/habits/api/get-habits";

export type HabitListProps = {
    userId: number;
}

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

    const habits = habitsQuery.data?.data;
    console.log("Habits API response:", habitsQuery.data);
    
    if (!habits || habits.length === 0) {
        return <div>No habits found.</div>;
    }

    return (
        <div>
            <h2>Habit List</h2>
            <ul>
                {habits.map((habit) => (
                    <li key={habit.id}>
                        {habit.name} - {habit.question}
                    </li>
                ))}
            </ul>
        </div>
    );
};