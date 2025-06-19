import { CheckboxRow } from "@/components/ui/checkbox-row";
import { Label } from "@/components/ui/label";
import type { Habit } from "@/types/types";

export type HabitListElementProps = {
    habit: Habit;
    days?: number;
};

export const HabitListElement = ({
    habit,
    days = 5
}: HabitListElementProps) => {
    return (
        <li key={habit.id} className="
            flex justify-stretch 
            mx-4 my-1 p-2
            border-2 rounded-sm 
            border-slate-800 
            bg-slate-800/50 
            hover:border-slate-500
            hover:bg-slate-800
            align-items-center"
        >
            <Label mainText={habit.name} subText={habit.frequency} />
            <CheckboxRow num={days} />
        </li> 
    );
};
