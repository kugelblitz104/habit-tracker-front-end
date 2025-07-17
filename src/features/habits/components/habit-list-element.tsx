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
        <button type="button" className="text-blue-500 hover:text-blue-700"
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
    const today = new Date();
    const dates = [...Array(days).keys()].map((day) => {
        return new Date(today.getFullYear(), today.getMonth(), today.getDate() - day);
    });
    
    const getStatus = (h: Habit, date: Date): Status => {
        const tracker = h.trackers.find(tracker =>
            new Date(tracker.dated).toDateString() === date.toDateString()
        );

        if (!tracker) {
            console.log(`No tracker found for ${h.name} on ${date.toISOString()}`);
            return Status.NOT_COMPLETED;
        }
        
        if (tracker?.completed) return Status.COMPLETED;
        if (tracker?.skipped) return Status.SKIPPED;
        return Status.NOT_COMPLETED;
    }

    return (
        <tr
            key={habit.id}
            className="
            bg-slate-800/50 
            hover:bg-slate-800
            h-12
            align-middle
            "
        >
            <td>
                <Label mainText={habit.name} subText={habit.frequency} />
            </td>
            {dates.map((date) => (
                <td className="text-center" key={date.toISOString()}>
                    <TrackerCheckbox status={getStatus(habit, date)} 
                    // onClick={() => handleCheckboxClick(button)} 
                    />
                </td>
            ))}
        </tr>   
    );
};
