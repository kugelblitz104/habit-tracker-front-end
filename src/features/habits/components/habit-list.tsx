import { useMutation, useQuery } from "@tanstack/react-query";
import { getHabits} from "@/features/habits/api/get-habits";
import { HabitListElement } from "./habit-list-element";
import { SaveButton } from "@/components/ui/save_button";
import { useState, useEffect } from "react";
import { updateHabit } from "../api/update-habits";
import type { Habit } from "@/types/types";

export type HabitListProps = {
    userId: number;
    days?: number; 
}

// TODO: context to hold number of days?

export const HabitList = ({
    userId,
    days = 10
}: HabitListProps) => {
    //TODO: add a function to break out an mutated habits object into discreet tracker create/update operations
    //TODO: add a mutator to update habits.trackers
    //TODO: track habits in state
    // Hooks
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
    const [isLoading, setIsLoading] = useState(false);
    const today = new Date()
    const date_formatter = new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit"
    });

    // Functions
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

    // Render
    if (habitsQuery.isLoading) {
        return <div>Loading...</div>;
    }

    if (habitsQuery.isError) {
        return <div>Error loading habits: {habitsQuery.error.message}</div>;
    }

    const habitsResult = habitsQuery.data?.habits;
    if (!habitsResult || habitsResult.length === 0) {
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
                        // onHabitUpdate={handleHabitUpdate}
                    />
                    ))}
                </tbody>
            </table>
            {/* <SaveButton onClick={() => {
                // TODO: implement save functionality
                setIsLoading(true);
                setTimeout(() => {
                    setIsLoading(false);
                }, 5000);
            }} isLoading={isLoading} /> */}
        </div>
    );
};