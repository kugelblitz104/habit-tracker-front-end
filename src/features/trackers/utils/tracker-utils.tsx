import type { TrackerCreate, TrackerRead, TrackerUpdate } from '@/api';
import { Status } from '@/types/types';
import { Check, ChevronsRight, Square } from 'lucide-react';

/**
 * Get the status of a tracker
 */
export const getTrackerStatus = (tracker: TrackerRead | undefined): Status => {
    if (!tracker) return Status.NOT_COMPLETED;
    if (tracker.completed) return Status.COMPLETED;
    if (tracker.skipped) return Status.SKIPPED;
    return Status.NOT_COMPLETED;
};

/**
 * Get the icon component for a tracker status
 */
export const getTrackerIcon = (status: Status, className?: string) => {
    const iconClass = className || 'w-5 h-5';

    switch (status) {
        case Status.COMPLETED:
            return (
                <Check className={iconClass} color='green' strokeWidth={3} />
            );
        case Status.SKIPPED:
            return (
                <ChevronsRight
                    className={iconClass}
                    color='lightblue'
                    strokeWidth={3}
                />
            );
        case Status.NOT_COMPLETED:
        default:
            return (
                <Square className={iconClass} color='white' strokeWidth={1} />
            );
    }
};

/**
 * Get the next state in the tracker status cycle
 * Cycles: not completed → completed → skipped → not completed
 */
export const getNextTrackerState = (
    tracker: TrackerRead | undefined
): TrackerUpdate => {
    if (!tracker || (!tracker.completed && !tracker.skipped)) {
        return { completed: true, skipped: false };
    } else if (tracker.completed) {
        return { completed: false, skipped: true };
    } else {
        return { completed: false, skipped: false };
    }
};

/**
 * Create a new tracker object for a given habit and date
 */
export const createNewTracker = (
    habitId: number,
    date: Date,
    completed: boolean = true
): TrackerCreate => {
    return {
        habit_id: habitId,
        dated: date.toISOString().split('T')[0],
        completed,
        skipped: false,
        note: ''
    };
};
