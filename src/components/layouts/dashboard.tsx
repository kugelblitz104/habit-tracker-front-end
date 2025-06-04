import { HabitList } from "@/features/habits/components/habit-list";

export function Dashboard() {
    return (
        <>
            <h1>Habit Tracker</h1>
            <HabitList userId={1} />
        </>
    );
}