import { AddButton } from "@/features/habits/components/add-button";

export const TitleBar = () => {
    return (
        <div className="p-4 mb-4 bg-slate-800 static">
            <div className="flex items-center">
                <h1 className="text-xl">Habit Tracker</h1>
                <AddButton className="ml-4" />
            </div>
        </div>
    );
}