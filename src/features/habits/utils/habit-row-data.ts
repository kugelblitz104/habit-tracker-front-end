import type { HabitKPIs, HabitRead, HabitTrackersLite, TrackerLite } from '@/api';
import { getDisplayStatusForDate } from '@/features/trackers/utils/tracker-utils';
import { DisplayStatus } from '@/types/types';

export type HabitRowData = {
    trackers: TrackerLite[];
    /** `undefined` (not an empty Set) when the batch carried no entry, so
     *  getDisplayStatusForDate falls back to computing auto-skip locally. An
     *  empty Set is truthy and would silently suppress auto-skip. */
    autoSkippedDates: Set<string> | undefined;
    streak: number;
    status: DisplayStatus;
};

/**
 * Everything each dashboard row renders, derived once for the whole list.
 *
 * Rows used to own a trackers-lite query and a KPI query each and report
 * streak/visibility/today-status back up through callbacks; this replaces all
 * of that with one synchronous pass over the batch responses.
 */
export const buildHabitRowData = (
    habits: HabitRead[],
    trackersByHabit: Map<number, HabitTrackersLite>,
    kpisByHabit: Map<number, HabitKPIs>,
    today: Date
): Map<number, HabitRowData> => {
    const rows = new Map<number, HabitRowData>();

    for (const habit of habits) {
        const entry = trackersByHabit.get(habit.id);
        const trackers = entry?.trackers ?? [];
        const autoSkippedDates = entry?.auto_skipped_dates
            ? new Set(entry.auto_skipped_dates)
            : undefined;

        rows.set(habit.id, {
            trackers,
            autoSkippedDates,
            streak: kpisByHabit.get(habit.id)?.current_streak ?? 0,
            status: getDisplayStatusForDate(trackers, today, habit, autoSkippedDates)
        });
    }

    return rows;
};

/**
 * "Habits left today": non-archived habits whose today status is
 * not-completed or manually skipped. The same rule the Incomplete filter
 * uses, so the header figure and the filtered list always agree.
 */
export const countHabitsLeft = (habits: HabitRead[], rows: Map<number, HabitRowData>): number =>
    habits.filter((habit) => {
        if (habit.archived) return false;
        const status = rows.get(habit.id)?.status;
        return status === DisplayStatus.NOT_COMPLETED || status === DisplayStatus.SKIPPED;
    }).length;

/**
 * "Habits left today" from the flags already on `HabitRead`, for the window
 * where the habits list has landed but the trackers batch has not.
 *
 * Approximate on purpose, in two ways the exact count is not: it cannot see
 * auto-skip (only the batch reports it), and a manually skipped habit reads as
 * done here where `countHabitsLeft` reads it as left. It is on screen only
 * until the batch arrives.
 */
export const countHabitsLeftFromFlags = (habits: HabitRead[]): number =>
    habits.filter((habit) => !habit.archived && !habit.completed_today && !habit.skipped_today)
        .length;

/** Streaks in the shape `useHabitListSort` takes for its `streak` sort. */
export const streakMap = (rows: Map<number, HabitRowData>): Map<number, number> =>
    new Map([...rows].map(([habitId, row]) => [habitId, row.streak]));
