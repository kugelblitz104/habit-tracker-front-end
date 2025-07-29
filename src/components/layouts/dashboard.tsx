import { HabitList } from "@/features/habits/components/habit-list";
import { TitleBar } from "../ui/title-bar";

export function Dashboard() {
    return (
        <>
            <TitleBar />
            <HabitList userId={1} />
        </>
    );
}