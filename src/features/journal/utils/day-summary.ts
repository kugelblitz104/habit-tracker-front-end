import type { HabitRead, TaskRead, TimeEntryRead, TrackerRead } from '@/api';
import { formatCompactTime } from '@/features/tasks/utils/task-format';
import { isAutoSkipped } from '@/features/trackers/utils/tracker-utils';
import { parseLocalDate, parseServerDate, toLocalDateString } from '@/lib/date-utils';

const pad = (value: number) => String(value).padStart(2, '0');

/** The local clock time of a server timestamp, e.g. "2:14p". */
export const localClockLabel = (stamp: string | null | undefined): string | null => {
    if (!stamp) return null;
    const instant = parseServerDate(stamp);
    return formatCompactTime(`${pad(instant.getHours())}:${pad(instant.getMinutes())}`);
};

export type TimeGroup = {
    /** `null` is the "no project" bucket, kept rather than dropped. */
    projectId: number | null;
    seconds: number;
};

/**
 * A day's time entries rolled up per project, largest first.
 *
 * Entries are bucketed by `resolved_project_id`, which the server already
 * resolves through a subtask's parent, so a subtask's time lands on the same
 * project its parent belongs to. A running entry has no duration yet and
 * contributes nothing rather than counting as zero-length work.
 */
export const groupTimeByProject = (entries: TimeEntryRead[]): TimeGroup[] => {
    const totals = new Map<number | null, number>();

    for (const entry of entries) {
        const seconds = entry.duration_seconds ?? 0;
        if (seconds <= 0) continue;
        const key = entry.resolved_project_id ?? null;
        totals.set(key, (totals.get(key) ?? 0) + seconds);
    }

    return [...totals]
        .map(([projectId, seconds]) => ({ projectId, seconds }))
        .sort((a, b) => b.seconds - a.seconds);
};

/** Total logged seconds for a day, matching what `groupTimeByProject` splits up. */
export const totalTimeSeconds = (entries: TimeEntryRead[]): number =>
    entries.reduce((sum, entry) => sum + Math.max(0, entry.duration_seconds ?? 0), 0);

/**
 * How many habits were actually asked of a day.
 *
 * A habit whose goal was already met inside its range window is auto-skipped:
 * a once-a-month habit kept last week is not owed anything today, so counting
 * it would report 1/4 on a day that was really 1/3. Archived habits are out
 * either way.
 *
 * `trackers` must reach back `range - 1` days before `date`, or a habit reads
 * as expected on every day its own history was cut off from.
 */
export const habitsExpectedOn = (
    habits: HabitRead[],
    trackers: TrackerRead[],
    date: string
): number => {
    const day = parseLocalDate(date);
    const byHabit = new Map<number, TrackerRead[]>();
    for (const tracker of trackers) {
        const seen = byHabit.get(tracker.habit_id);
        if (seen) seen.push(tracker);
        else byHabit.set(tracker.habit_id, [tracker]);
    }

    return habits.filter(
        (habit) =>
            !habit.archived &&
            !isAutoSkipped(day, byHabit.get(habit.id) ?? [], habit.frequency, habit.range)
    ).length;
};

/**
 * Whether a task was closed on the same local day it was created.
 *
 * Such a task belongs to Completed alone: listing it under Created as well
 * says the day did two things when it did one.
 */
export const closedOnCreationDay = (task: TaskRead, date: string): boolean =>
    !!task.closed_date && toLocalDateString(parseServerDate(task.closed_date)) === date;
