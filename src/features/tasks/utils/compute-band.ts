import type { TaskRead } from '@/api';
import { parseLocalDate, parseServerDate, toLocalDateString } from '@/lib/date-utils';
import { TaskStatus, type TaskBand } from '@/types/types';

/**
 * Client-side urgency banding. Mirrors the backend's `compute_band`
 * (habit-tracker `src/habit_tracker/constants.py`) in the same first-match-wins
 * order, and adds Blocked as a `now` condition.
 *
 * This, not `TaskRead.band`, is what the UI paints, groups and sorts by. The
 * server field is still used by the `?band=` query filter on GET /tasks/. The
 * two deliberately differ, so this is not a parity mirror.
 *
 * Computed here rather than read off the wire because the tasks router bands
 * from `date.today()` and accepts no `tz` param, so a browser whose local date
 * differs from the API container's UTC saw bands a day off.
 */

/** A task untouched for this many days or more reads as stale. */
export const STALE_AFTER_DAYS = 14;

/** Statuses where "not touched recently" is a problem rather than the point. */
const STALEABLE_STATUSES: number[] = [
    TaskStatus.OPEN,
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
    TaskStatus.NEEDS_INFO
];

const BAND_RANK: Record<Exclude<TaskBand, 'hidden'>, number> = { now: 0, soon: 1, whenever: 2 };

/** Local midnight for the given instant. */
export const startOfToday = (now: Date = new Date()): Date =>
    parseLocalDate(toLocalDateString(now));

/** Calendar-day arithmetic, so a DST boundary can't shift the result an hour. */
export const addDays = (date: Date, days: number): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Earliest of the due and scheduled dates, or null when both are unset. */
const effectiveDate = (task: TaskRead): Date | null => {
    const dates = [task.due_date, task.scheduled_date]
        .filter((value): value is string => !!value)
        .map(parseLocalDate);
    if (dates.length === 0) return null;
    return dates.reduce((earliest, date) => (date < earliest ? date : earliest));
};

/**
 * Whether a task has gone untouched for `STALE_AFTER_DAYS`. This reads
 * "not edited", not "no progress": `updated_date` bumps on any write, so a bulk
 * priority change resets it.
 *
 * Deliberately NOT an input to `computeBand`. Promoting every stale task to
 * `now` would put a whole backlog under "Needs attention". It is a reason chip
 * on a task that is already banded `now`.
 */
export const isStale = (task: TaskRead, today: Date = startOfToday()): boolean => {
    if (!STALEABLE_STATUSES.includes(task.status ?? TaskStatus.OPEN)) return false;
    const stamp = task.updated_date ?? task.created_date;
    if (!stamp) return false;
    // parseServerDate, not parseLocalDate: these are naive datetimes with no
    // designator, so the browser would otherwise read them as local and skew by
    // the UTC offset.
    const touchedOn = startOfToday(parseServerDate(stamp));
    return touchedOn <= addDays(today, -STALE_AFTER_DAYS);
};

export const computeBand = (task: TaskRead, today: Date = startOfToday()): TaskBand => {
    const status = task.status ?? TaskStatus.OPEN;
    if (status === TaskStatus.DONE || status === TaskStatus.CANCELLED) return 'hidden';
    if (status === TaskStatus.DEFERRED) return 'whenever';

    const date = effectiveDate(task);
    const priority = task.priority ?? 0;

    if ((date !== null && date <= today) || priority === 3 || status === TaskStatus.BLOCKED) {
        return 'now';
    }
    if ((date !== null && date <= addDays(today, 7)) || priority === 2) return 'soon';
    return 'whenever';
};

/**
 * Map a possibly-hidden band onto the three that render and rank. Closed tasks
 * fall back to the quiet 'whenever' look, same as any other non now/soon band.
 */
export const toActiveBand = (band: string | null | undefined): Exclude<TaskBand, 'hidden'> =>
    band === 'now' || band === 'soon' ? band : 'whenever';

/** Sort rank for a band: now first, whenever last. */
export const bandRank = (band: TaskBand | null | undefined): number =>
    BAND_RANK[toActiveBand(band)];
