import { parseServerDate } from './date-utils';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Past this, "Nd ago" stops being something a reader can picture. */
const ABSOLUTE_CUTOFF = 30 * DAY;

const parse = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const date = parseServerDate(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * How long ago a server timestamp was, as a short label: "just now", "5m ago",
 * "3h ago", "12d ago", and a "Sep 3" short date past a month (with the year
 * when it isn't the current one). Returns null for a missing or unparseable
 * value, so a caller can drop the whole field.
 *
 * Each unit floors rather than rounds, so a label never claims more elapsed
 * time than has passed. A timestamp in the future clamps to "just now" instead
 * of counting up: the API host's clock and the browser's can disagree, and
 * "in 4h" on a task created a moment ago reads as a bug.
 */
export const formatRelative = (
    value: string | null | undefined,
    now: Date = new Date()
): string | null => {
    const date = parse(value);
    if (!date) return null;

    const elapsed = now.getTime() - date.getTime();
    if (elapsed < MINUTE) return 'just now';
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
    if (elapsed < ABSOLUTE_CUTOFF) return `${Math.floor(elapsed / DAY)}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' })
    });
};

/**
 * The full date and time of a server timestamp ("Sep 3, 2026, 2:14 PM"), for
 * the tooltip behind a relative label. Returns null for a missing or
 * unparseable value.
 *
 * Rendered in the **browser's** zone, and it should stay that way even once a
 * profile carries a `timezone` of its own: a reader asking when something
 * happened wants their own local time, not the zone their profile records.
 */
export const formatAbsolute = (value: string | null | undefined): string | null => {
    const date = parse(value);
    if (!date) return null;
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};
