import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';

/**
 * Time-to-due model for the Countdown surfaces. Everything derives from a
 * target `date` (+ optional `time`) relative to `now`, computed client-side so
 * it stays live without a server round-trip.
 *
 * A date-only target is treated as end-of-day; a timed target uses the exact
 * local instant. When `repeat` is set, the stored date is an ANCHOR and the
 * NEXT occurrence is computed here (a passed birthday rolls to next year, a
 * bill to next month), so recurring countdowns never read as overdue.
 */

export type CountdownGroup = 'overdue' | 'today' | 'week' | 'later';
export type CountdownUrgency = 'overdue' | 'now' | 'soon' | 'later';
export type CountdownRepeat = 'none' | 'weekly' | 'monthly' | 'monthly_weekday' | 'yearly';

export type Countdown = {
    /** Due instant (ms since epoch, local) — the sort key: soonest/most overdue first. */
    dueMs: number;
    /** Whole calendar days until due; negative when overdue, 0 when due today. */
    daysUntil: number;
    overdue: boolean;
    /** Compact remaining label, e.g. "3d", "5h 20m", "due today", "2d overdue". */
    label: string;
    group: CountdownGroup;
    /** Calm → urgent bucket, mapped to band accent colors by the UI. */
    urgency: CountdownUrgency;
    /** Whether the shown occurrence came from a recurrence rule. */
    recurs: boolean;
};

const DAY_MS = 86_400_000;
const pad2 = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Last day of a (0-based) month, used to clamp e.g. day 31 into February. */
const lastDayOfMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();
const clampDay = (year: number, month: number, day: number): number =>
    Math.min(day, lastDayOfMonth(year, month));

/**
 * Date of the `ordinal`-th `weekday` in a (0-based) month. `ordinal` 1–4 counts
 * from the start; 5 (or beyond what the month holds) means the LAST such weekday.
 */
const nthWeekdayOfMonth = (year: number, month: number, weekday: number, ordinal: number): Date => {
    if (ordinal >= 5) {
        const last = lastDayOfMonth(year, month);
        const lastDow = new Date(year, month, last).getDay();
        return new Date(year, month, last - ((lastDow - weekday + 7) % 7));
    }
    const firstDow = new Date(year, month, 1).getDay();
    const day = 1 + ((weekday - firstDow + 7) % 7) + (ordinal - 1) * 7;
    // Requested ordinal doesn't exist this month (e.g. a 5th that isn't there):
    // fall back one week to the last occurrence.
    return new Date(year, month, day > lastDayOfMonth(year, month) ? day - 7 : day);
};

/**
 * Resolve a recurring anchor to its next occurrence date (YYYY-MM-DD) at or
 * after `today`. Returns the anchor unchanged for non-recurring, or when the
 * anchor is itself still upcoming.
 */
const nextOccurrence = (anchorStr: string, repeat: CountdownRepeat, today: Date): string => {
    const anchor = parseLocalDate(anchorStr);
    if (repeat === 'none' || anchor >= today) return anchorStr;

    if (repeat === 'weekly') {
        const weeks = Math.ceil((today.getTime() - anchor.getTime()) / (7 * DAY_MS));
        const d = new Date(anchor);
        d.setDate(anchor.getDate() + weeks * 7);
        return isoDate(d);
    }
    if (repeat === 'monthly') {
        const day = anchor.getDate();
        let y = today.getFullYear();
        let m = today.getMonth();
        let d = new Date(y, m, clampDay(y, m, day));
        if (d < today) {
            if (++m > 11) (m = 0), y++;
            d = new Date(y, m, clampDay(y, m, day));
        }
        return isoDate(d);
    }
    if (repeat === 'yearly') {
        const mo = anchor.getMonth();
        const day = anchor.getDate();
        let y = today.getFullYear();
        let d = new Date(y, mo, clampDay(y, mo, day));
        if (d < today) d = new Date(++y, mo, clampDay(y, mo, day));
        return isoDate(d);
    }
    // monthly_weekday: Nth weekday derived from the anchor.
    const weekday = anchor.getDay();
    const ordinal = Math.floor((anchor.getDate() - 1) / 7) + 1;
    let y = today.getFullYear();
    let m = today.getMonth();
    let d = nthWeekdayOfMonth(y, m, weekday, ordinal);
    if (d < today) {
        if (++m > 11) (m = 0), y++;
        d = nthWeekdayOfMonth(y, m, weekday, ordinal);
    }
    return isoDate(d);
};

/** The local instant a target is due: the given time, else end of that day. */
const dueInstant = (date: string, time: string | null | undefined): Date => {
    const d = parseLocalDate(date);
    if (time) {
        const [h, m] = time.split(':');
        d.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
    } else {
        d.setHours(23, 59, 59, 999);
    }
    return d;
};

/**
 * Compute the countdown for a `date` (+ optional `time`, `repeat`), or null when
 * there's no date. Shared by task due dates (never repeat) and Countdown entity
 * targets. `now` is injectable for deterministic rendering/testing.
 */
export const getCountdown = (
    date: string | null | undefined,
    time: string | null | undefined,
    now: Date = new Date(),
    repeat: CountdownRepeat = 'none'
): Countdown | null => {
    if (!date) return null;

    const effective = nextOccurrence(date, repeat, startOfDay(now));
    const recurs = repeat !== 'none' && effective !== date;

    const nowMs = now.getTime();
    const dueMs = dueInstant(effective, time).getTime();
    const overdue = dueMs < nowMs;

    // Calendar-day delta at date granularity (both anchored to local midnight),
    // so "days until" reads the way a person counts days on a calendar.
    const todayMid = parseLocalDate(toLocalDateString(now)).getTime();
    const dueMid = parseLocalDate(effective).getTime();
    const daysUntil = Math.round((dueMid - todayMid) / DAY_MS);

    const diffMs = dueMs - nowMs;
    let label: string;
    if (overdue) {
        label = daysUntil === 0 ? 'overdue' : `${Math.abs(daysUntil)}d overdue`;
    } else if (time && daysUntil === 0) {
        const h = Math.floor(diffMs / 3_600_000);
        const min = Math.floor((diffMs % 3_600_000) / 60_000);
        label = h > 0 ? `${h}h ${min}m` : `${min}m`;
    } else if (daysUntil === 0) {
        label = 'due today';
    } else if (daysUntil === 1) {
        label = 'tomorrow';
    } else {
        label = `${daysUntil}d`;
    }

    let group: CountdownGroup;
    if (overdue) group = 'overdue';
    else if (daysUntil === 0) group = 'today';
    else if (daysUntil <= 7) group = 'week';
    else group = 'later';

    let urgency: CountdownUrgency;
    if (overdue) urgency = 'overdue';
    else if (daysUntil <= 1) urgency = 'now';
    else if (daysUntil <= 7) urgency = 'soon';
    else urgency = 'later';

    return { dueMs, daysUntil, overdue, label, group, urgency, recurs };
};

/** Presentation metadata per urgency bucket — accent color + human label. */
export const URGENCY_META: Record<CountdownUrgency, { label: string; color: string }> = {
    overdue: { label: 'Overdue', color: 'var(--color-danger)' },
    now: { label: 'Due now', color: 'var(--color-now-accent)' },
    soon: { label: 'This week', color: 'var(--color-soon-label)' },
    later: { label: 'Later', color: 'var(--color-whenever-text)' }
};

/** Section metadata for the time-grouped Countdown view, in display order. */
export const COUNTDOWN_GROUPS: { key: CountdownGroup; label: string; color: string }[] = [
    { key: 'overdue', label: 'Overdue', color: 'var(--color-danger)' },
    { key: 'today', label: 'Today', color: 'var(--color-now-accent)' },
    { key: 'week', label: 'This week', color: 'var(--color-soon-label)' },
    { key: 'later', label: 'Later', color: 'var(--color-whenever-text)' }
];

/** Urgency accent color for a group (the hero number's color). */
export const groupColor = (group: CountdownGroup): string =>
    COUNTDOWN_GROUPS.find((g) => g.key === group)!.color;

/**
 * The prominent hero readout for a countdown card: a big value + a small unit.
 * "Today" / "Overdue" collapse to a single word (no unit); day counts read as
 * a number + "days".
 */
export const countdownHero = (c: Countdown): { value: string; unit: string | null } => {
    if (c.overdue) {
        if (c.daysUntil === 0) return { value: 'Overdue', unit: null };
        const n = Math.abs(c.daysUntil);
        return { value: String(n), unit: n === 1 ? 'day overdue' : 'days overdue' };
    }
    if (c.daysUntil === 0) return { value: 'Today', unit: null };
    if (c.daysUntil === 1) return { value: '1', unit: 'day' };
    return { value: String(c.daysUntil), unit: 'days' };
};

const nthOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/**
 * Ordinal of the shown occurrence for a recurring countdown, derived from the
 * anchor — e.g. a birthday anchored on the birth date returns "26th" on the
 * 26th anniversary. Null for non-recurring, or before the first occurrence.
 */
export const occurrenceLabel = (
    anchorDate: string,
    repeat: string | null | undefined,
    now: Date = new Date()
): string | null => {
    if (!repeat || repeat === 'none') return null;
    const anchor = parseLocalDate(anchorDate);
    const next = parseLocalDate(nextOccurrence(anchorDate, repeat as CountdownRepeat, startOfDay(now)));
    let n: number;
    switch (repeat) {
        case 'yearly':
            n = next.getFullYear() - anchor.getFullYear();
            break;
        case 'weekly':
            n = Math.round((next.getTime() - anchor.getTime()) / (7 * DAY_MS));
            break;
        case 'monthly':
        case 'monthly_weekday':
            n = (next.getFullYear() - anchor.getFullYear()) * 12 + (next.getMonth() - anchor.getMonth());
            break;
        default:
            return null;
    }
    return n >= 1 ? nthOrdinal(n) : null;
};

/** Repeat options for the countdown form select. */
export const REPEAT_OPTIONS: { value: CountdownRepeat; label: string }[] = [
    { value: 'none', label: 'Does not repeat' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly (same date)' },
    { value: 'monthly_weekday', label: 'Monthly (same weekday)' },
    { value: 'yearly', label: 'Yearly' }
];

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

/** Short human label for a repeat rule, e.g. "Yearly", "Monthly (3rd Mon)". */
export const repeatLabel = (
    repeat: string | null | undefined,
    anchor?: string | null
): string | null => {
    switch (repeat) {
        case 'weekly':
            return 'Weekly';
        case 'monthly':
            return 'Monthly';
        case 'yearly':
            return 'Yearly';
        case 'monthly_weekday': {
            if (!anchor) return 'Monthly';
            const d = parseLocalDate(anchor);
            const ord = Math.floor((d.getDate() - 1) / 7) + 1;
            const wd = d.toLocaleDateString(undefined, { weekday: 'short' });
            return `Monthly (${ord >= 5 ? 'last' : ORDINALS[ord - 1]} ${wd})`;
        }
        default:
            return null;
    }
};
