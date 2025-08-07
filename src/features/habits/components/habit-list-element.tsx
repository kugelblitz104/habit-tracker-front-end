import { Label } from "@/components/ui/label";
import { createTracker } from "@/features/trackers/api/create-trackers";
import { updateTracker } from "@/features/trackers/api/update-trackers";
import type { Habit, Tracker, TrackerCreate } from "@/types/types";
import { Status } from "@/types/types";
import { useMutation } from "@tanstack/react-query";
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
    // onHabitUpdate: (habit: Habit) => void;
};

export const HabitListElement = ({
    habit,
    days = 5,
    // onHabitUpdate,
}: HabitListElementProps) => {
    const today = new Date();
    const dates = [...Array(days).keys()].map((day) => {
        return new Date(today.getFullYear(), today.getMonth(), today.getDate() - day, today.getHours(), today.getMinutes(), today.getSeconds(), today.getMilliseconds());
    });
    const [trackers, setTrackers] = useState<Tracker[]>(habit.trackers);
    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onError: (error) => {
            console.error("Error adding tracker:", error);
        }
    });
    const trackerUpdate = useMutation({
        mutationFn: (tracker: Tracker) => updateTracker(tracker),
        onError: (error) => {
            console.error("Error updating tracker:", error);
        }
    });

    // functions
    const getTracker = (date: Date): Tracker | undefined => {
        return trackers.find(tracker =>
            tracker.dated === date.toISOString().split("T")[0]
        );
    };

    const getStatus = (date: Date): Status => {
        const tracker = getTracker(date);

        if (!tracker) return Status.NOT_COMPLETED;
        if (tracker?.completed) return Status.COMPLETED;
        if (tracker?.skipped) return Status.SKIPPED;
        return Status.NOT_COMPLETED;
    }

    const getFrequencyString = (frequency: number, range: number) => {
        if (frequency === range ) return "daily";
        if (frequency === 1 && range === 7) return "weekly";
        if (frequency === 1 && range === 30) return "monthly";
        // if (frequency === 1 && range === 365) return "yearly"
    }

    const handleCheckboxClick = (date: Date) => {
        const tracker = getTracker(date);
        
        if (!tracker) {
            // create tracker if it doesn't exist
            const newTracker = {
                habit_id: habit.id,
                dated: date.toISOString().split("T")[0],
                completed: true,
                skipped: false,
                note: "",
            }
            trackerCreate.mutate(newTracker, {
                onSuccess: (data) => {
                    setTrackers([...trackers, data]);
                }
            });
            return;
        }

        if(!tracker.completed && !tracker.skipped) {
            // toggle completed
            trackerUpdate.mutate({
                ...tracker,
                completed: true,
                skipped: false,
            }, {
                onSuccess: (data) => {
                    setTrackers(trackers.map(t => t.id === tracker.id ? data : t));
                }
            });
        }
        else if(tracker.completed) {
            // toggle skipped
            trackerUpdate.mutate({
                ...tracker,
                completed: false,
                skipped: true,
            }, {
                onSuccess: (data) => {
                    setTrackers(trackers.map(t => t.id === tracker.id ? data : t));
                }
            });
        }
        else if(tracker.skipped) {
            // toggle not completed
            trackerUpdate.mutate({
                ...tracker,
                completed: false,
                skipped: false,
            }, {
                onSuccess: (data) => {
                    setTrackers(trackers.map(t => t.id === tracker.id ? data : t));
                }
            });
        }
    };


    // render
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
                <Label mainText={habit.name} subText={getFrequencyString(habit.frequency, habit.range)} />
            </td>
            {dates.map((date) => (
                <td className="text-center" key={date.toISOString()}>
                    <TrackerCheckbox status={getStatus(date)} 
                    onClick={() => handleCheckboxClick(date)} 
                    />
                </td>
            ))}
        </tr>   
    );
};
