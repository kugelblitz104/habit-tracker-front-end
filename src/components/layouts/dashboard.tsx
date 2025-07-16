import { HabitList } from "@/features/habits/components/habit-list";

export function Dashboard() {
    return (
        <>
            <div className="p-4 mb-4 bg-slate-800">
                <h1 className="text-xl">Habit Tracker</h1>
            </div>
            <HabitList userId={1} />
        </>
    );
}