import { useQuery } from "@tanstack/react-query";
import { getHabits} from "@/features/habits/api/get-habits";
import { HabitListElement } from "./habit-list-element";
import { SaveButton } from "@/components/ui/save_button";
import { useState } from "react";

export type HabitListProps = {
    userId: number;
    days?: number; 
}

// TODO: context to hold number of days?

export const HabitList = ({
    userId,
    days = 10
}: HabitListProps) => {
    const habitsQuery = useQuery ({
        queryKey: ['habits', { userId }],
        queryFn: () => getHabits(userId, days),
        staleTime: 1000 * 60, // 1 minute
    });
    const [isLoading, setIsLoading] = useState(false);
    const today = new Date()
    const date_formatter = new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit"
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
        <div className="overflow-x-auto mx-4">
            <table className="min-w-full table-auto">
                <thead>
                    <tr>
                    <th className="px-4 py-2 text-left">Habit</th>
                    {
                        Array.from({ length: days }, (_, i) => (
                        <th key={i} className="px-4 py-2 text-center">
                            {date_formatter.format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i))}
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
            </table>
            <SaveButton onClick={() => {
                // TODO: implement save functionality
                setIsLoading(true);
                setTimeout(() => {
                    setIsLoading(false);
                }, 5000);
            }} isLoading={isLoading} />
        </div>
    );
};