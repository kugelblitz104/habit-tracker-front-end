import { Label } from "@/components/ui/label";
import type { Habit } from "@/types/types";
import { Status } from "@/types/types";
import { useState } from "react";

export type TrackerCheckboxProps = {
    status: Status;
    onClick?: () => void;
}

const TrackerCheckbox = ({
    status = Status.NOT_COMPLETED,
    onClick,
}: TrackerCheckboxProps) => {
    return (
        <button className="
        text-blue-500 hover:text-blue-700 
        focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={onClick}
        >
        {
            status === "completed" ? "✔️" :
            status === "skipped" ? "⏭️" :
            status === "not_completed" ? "❌" :
            "?"
        }
        </button>
    )
}

export type HabitListElementProps = {
    habit: Habit;
    days?: number;
};

export const HabitListElement = ({
    habit,
    days = 5
}: HabitListElementProps) => {
    const buttons = [...Array(days).keys()];
    const [status, setStatus] = useState<Status[]>(Array(days).fill(Status.NOT_COMPLETED));

    const handleCheckboxClick = (index: number) => {
        setStatus((prevStatus) => {
            const newStatus = [...prevStatus];
            switch (newStatus[index]) {
                case Status.NOT_COMPLETED:
                    newStatus[index] = Status.SKIPPED;
                    break;
                case Status.SKIPPED:
                    newStatus[index] = Status.COMPLETED;
                    break;
                default:
                    newStatus[index] = Status.NOT_COMPLETED;
                    break;
            }
            return newStatus;
        });
    }

    return (
        <tr key={habit.id} className="
            bg-slate-800/50 
            hover:bg-slate-800"
        >
            <td>
                <Label mainText={habit.name} subText={habit.frequency} />
            </td>
            {buttons.map((button) => (
                <td key={button}>
                    <TrackerCheckbox status={status[button]} onClick={() => handleCheckboxClick(button)} />
                </td>
            ))}
        </tr>   
    );
};
