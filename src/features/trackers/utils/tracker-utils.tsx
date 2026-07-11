import type { HabitRead, TrackerCreate, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import { toLocalDateString } from '@/lib/date-utils';
import { DisplayStatus, TrackerStatus } from '@/types/types';
import { Check, ChevronsRight, Square } from 'lucide-react';

// Re-export for backwards compatibility
export { toLocalDateString };

/**
 * Hollow checkmark SVG component
 */
const HollowCheckmark = ({ className }: { className: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' className={className}>
        {/* Larger gray checkmark on bottom */}
        <path
            d='M20 6 9 17l-5-5'
            stroke='gray'
            strokeWidth='6'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        {/* Smaller background checkmark on top for hollow effect */}
        <path
            d='M20 6 9 17l-5-5'
            stroke='#1d293d'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
);

/**
 * Small corner indicator shown on a calendar/dashboard cell that carries a note.
 * A simple ~6px dot filled with the HABIT's own color (falling back to the theme
 * accent when no color is given). A thin dark outline ring keeps the pip visible
 * even on cells already filled with the same habit color (completed chips),
 * where a bare same-color dot would vanish.
 */
export const NotePip = ({ className, color }: { className: string; color?: string }) => (
    <span
        aria-hidden='true'
        className={`${className} pointer-events-none block h-1.5 w-1.5 rounded-full`}
        style={{
            background: color ?? 'var(--color-habit-accent)',
            boxShadow: '0 0 0 1.5px rgba(15, 20, 24, 0.85)'
        }}
    />
);

/**
 * Get the status of a tracker, optionally considering auto-skip eligibility.
 *
 * When autoSkipParams are provided, checks if the date qualifies for auto-skip
 * based on the habit's frequency/range settings (using the same logic as the backend).
 */
export const getTrackerDisplayStatus = (
    tracker: TrackerRead | TrackerLite | undefined,
    autoSkipParams?: {
        date: Date;
        trackers: (TrackerRead | TrackerLite)[];
        frequency: number;
        range: number;
    }
): DisplayStatus => {
    // If tracker exists with explicit state, use that
    if (tracker) {
        if (tracker.status === TrackerStatus.COMPLETED) return DisplayStatus.COMPLETED;
        if (tracker.status === TrackerStatus.SKIPPED) return DisplayStatus.SKIPPED;
    }

    // Check if this date qualifies for auto-skip
    if (autoSkipParams) {
        const { date, trackers, frequency, range } = autoSkipParams;
        if (isAutoSkipped(date, trackers, frequency, range)) {
            return DisplayStatus.AUTO_SKIPPED;
        }
    }

    return DisplayStatus.NOT_COMPLETED;
};

/**
 * Resolve the display status for `date` from a tracker list: finds the tracker
 * for that date (if any) and folds in auto-skip eligibility from the habit's
 * frequency/range. Shared by the dashboard row, the detail calendar's day
 * cells, and the Today panel's toggle so all three read a date's status the
 * same way.
 */
export const getDisplayStatusForDate = (
    trackers: TrackerLite[],
    date: Date,
    habit: Pick<HabitRead, 'frequency' | 'range'>
): DisplayStatus => {
    const tracker = findTrackerByDate(trackers, date);
    return getTrackerDisplayStatus(tracker, {
        date,
        trackers,
        frequency: habit.frequency,
        range: habit.range
    });
};

/**
 * Get the icon component for a tracker status
 * @param status - The tracker status
 * @param className - Optional CSS class for the icon
 * @param habitColor - Optional habit color to use for completed/auto-skipped states
 */
export const getTrackerIcon = (status: DisplayStatus, habitColor?: string) => {
    const iconClass = 'w-5 h-5';

    switch (status) {
        case DisplayStatus.COMPLETED:
            return <Check className={iconClass} color={habitColor || 'green'} strokeWidth={3} />;
        case DisplayStatus.SKIPPED:
            // Dashed container establishes the shared "dashed = skipped" language
            // used on the calendar, keeping it clearly distinct from the plain
            // Square of an incomplete day.
            return (
                <span className='flex h-5 w-5 items-center justify-center rounded-[5px] border border-dashed border-[var(--color-habit-label)]'>
                    <ChevronsRight
                        className='h-3.5 w-3.5'
                        color='var(--color-habit-label)'
                        strokeWidth={2.5}
                    />
                </span>
            );
        case DisplayStatus.AUTO_SKIPPED:
            return <HollowCheckmark className={iconClass} />;
        case DisplayStatus.NOT_COMPLETED:
        default:
            return <Square className={iconClass} color='white' strokeWidth={1} />;
    }
};

/**
 * Get the next state in the tracker status cycle
 * Cycles: not completed → completed → skipped → not completed
 */
export const getNextTrackerState = (
    tracker: TrackerRead | TrackerLite | undefined
): TrackerUpdate => {
    if (!tracker || tracker.status === TrackerStatus.NOT_COMPLETED) {
        return { status: TrackerStatus.COMPLETED };
    } else if (tracker.status === TrackerStatus.COMPLETED) {
        return { status: TrackerStatus.SKIPPED };
    } else {
        return { status: TrackerStatus.NOT_COMPLETED };
    }
};

/**
 * Create a new tracker object for a given habit and date
 */
export const createNewTracker = (
    habitId: number,
    date: Date,
    status: TrackerStatus = TrackerStatus.COMPLETED
): TrackerCreate => {
    return {
        habit_id: habitId,
        dated: toLocalDateString(date),
        status: status,
        note: ''
    };
};

/**
 * Find a tracker for a specific date from a list of trackers
 */
export const findTrackerByDate = (trackers: TrackerLite[], date: Date): TrackerLite | undefined => {
    const dateStr = toLocalDateString(date);
    return trackers.find((tracker) => tracker.dated === dateStr);
};

/**
 * Check if a date qualifies for auto-skip based on the habit's frequency/range settings.
 * Auto-skip means the user has already met their frequency goal within the range window,
 * so they don't need to complete the habit on this date to maintain their streak.
 *
 * Uses the same logic as the backend streak calculation:
 * - For each date, check the window from (date - range + 1) to date (inclusive)
 * - Count completions in that window (excluding the current date)
 * - If completions >= frequency, the streak continues (auto-skip eligible)
 *
 * Example: frequency=1, range=7, completed on Wed Dec 3rd
 * - On Dec 4th: window is Nov 28 - Dec 4, contains Dec 3rd completion → auto-skip
 * - On Dec 9th: window is Dec 3 - Dec 9, contains Dec 3rd completion → auto-skip
 * - On Dec 10th: window is Dec 4 - Dec 10, no completions → not auto-skip
 *
 * Note: For daily habits (frequency >= range), auto-skip never applies since you must
 * complete every day to meet the goal.
 */
export const isAutoSkipped = (
    date: Date,
    trackers: (TrackerRead | TrackerLite)[],
    frequency: number,
    range: number
): boolean => {
    // For daily habits (frequency >= range), you must complete every occurrence
    if (frequency >= range) {
        return false;
    }

    // Normalize current date to YYYY-MM-DD string (local timezone)
    const dateStr = toLocalDateString(date);

    // Calculate window start date string
    const windowStart = new Date(date);
    windowStart.setDate(date.getDate() - range + 1);
    const windowStartStr = toLocalDateString(windowStart);

    // Count completions in the window (excluding the current date)
    let completions = 0;
    for (const tracker of trackers) {
        if (!tracker.dated || tracker.status !== TrackerStatus.COMPLETED) continue;

        // Compare using string dates to avoid timezone issues
        // tracker.dated is already in YYYY-MM-DD format
        if (
            tracker.dated >= windowStartStr &&
            tracker.dated < dateStr &&
            tracker.status === TrackerStatus.COMPLETED
        ) {
            completions++;
        }
    }

    // If completions already meet or exceed frequency, the day is auto-skipped
    return completions >= frequency;
};
