import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Ordinal suffix for a day-of-month (1st, 2nd, 3rd, 4th, …). */
const ordinal = (day: number): string => {
    const rem100 = day % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
    switch (day % 10) {
        case 1:
            return `${day}st`;
        case 2:
            return `${day}nd`;
        case 3:
            return `${day}rd`;
        default:
            return `${day}th`;
    }
};

/** "Jul 8th" style short date. */
export const formatShortDate = (date: Date): string =>
    `${MONTHS[date.getMonth()]} ${ordinal(date.getDate())}`;

/**
 * Compact 12-hour time from an HH:MM[:SS] string — "2:00p", "9:30a", "12:15p".
 * Returns null for anything it can't parse (so callers can just skip the time).
 */
export const formatCompactTime = (time: string | null | undefined): string | null => {
    if (!time) return null;
    const match = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    const suffix = hours < 12 ? 'a' : 'p';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`;
};

export type DueInfo = {
    label: string;
    /** True when due today or overdue — rendered with the hot "due today" chip. */
    hot: boolean;
};

/**
 * Resolve a task `due_date` (YYYY-MM-DD) into a chip label + urgency. Overdue,
 * due-today and due-tomorrow each get a plain-English label (all "hot" except
 * future dates further out, which fall back to the short-date label).
 */
export const getDueInfo = (
    dueDate: string | null | undefined,
    today = new Date()
): DueInfo | null => {
    if (!dueDate) return null;
    const due = parseLocalDate(dueDate);
    const todayStr = toLocalDateString(today);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowStr = toLocalDateString(tomorrow);

    if (dueDate === todayStr) return { label: 'due today', hot: true };
    if (dueDate < todayStr) return { label: 'overdue', hot: true };
    if (dueDate === tomorrowStr) return { label: 'due tomorrow', hot: true };
    return { label: `due ${formatShortDate(due)}`, hot: false };
};

/**
 * Resolve a task `scheduled_date` (+ optional `scheduled_time`) into a chip
 * label — "scheduled · Jul 8th" or "scheduled · Jul 8th · 2:00p". Dates are
 * parsed with the local-date-safe helper (never `new Date(iso)`, which would
 * shift by timezone).
 */
export const getScheduledLabel = (
    scheduledDate: string | null | undefined,
    scheduledTime?: string | null | undefined
): string | null => {
    if (!scheduledDate) return null;
    const date = formatShortDate(parseLocalDate(scheduledDate));
    const time = formatCompactTime(scheduledTime);
    return time ? `scheduled · ${date} · ${time}` : `scheduled · ${date}`;
};
