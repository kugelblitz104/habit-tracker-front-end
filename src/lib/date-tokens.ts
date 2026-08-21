/**
 * Date grammar shared by the quick-add token parsers. Accepts the relative
 * forms (`today`, `tom`, weekday names, `+3d`) and the flexible numeric ones
 * (`M-D`, `M/D`, `M-D-YY`, `M-D-YYYY`). Every function returns `YYYY-MM-DD`
 * or null.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date): string =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Weekday names + common abbreviations → 0(Sun)–6(Sat).
const WEEKDAY_INDEX: Record<string, number> = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    weds: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6
};

/**
 * Parse a *relative* date token into YYYY-MM-DD, or null when it isn't one.
 * Accepts `today`/`tod`, `tom`/`tomorrow`, `+Nd` (N days out) and weekday
 * names/abbreviations (`fri`, `friday`). Weekdays always resolve to the next
 * such day in the future: a token matching today's weekday means next week.
 * Resolved against `now` so "today" tracks the wall clock.
 */
export const parseRelativeDate = (raw: string, now: Date): string | null => {
    const key = raw.toLowerCase();
    // Midnight-anchored copy so day arithmetic can't be skewed by the time.
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (key === 'today' || key === 'tod') return toISODate(base);
    if (key === 'tomorrow' || key === 'tom') {
        base.setDate(base.getDate() + 1);
        return toISODate(base);
    }
    const rel = /^\+(\d+)d$/.exec(key);
    if (rel) {
        base.setDate(base.getDate() + Number(rel[1]));
        return toISODate(base);
    }
    if (key in WEEKDAY_INDEX) {
        const delta = (WEEKDAY_INDEX[key]! - base.getDay() + 7) % 7 || 7;
        base.setDate(base.getDate() + delta);
        return toISODate(base);
    }
    return null;
};

/**
 * Parse a flexible short date into YYYY-MM-DD, or null if it doesn't look like a
 * date. Accepts `M-D`, `M/D`, `M-D-YY`, `M-D-YYYY` (and `/` variants). A missing
 * year defaults to `fallbackYear`; a two-digit year maps to 2000+YY.
 */
export const parseFlexibleDate = (raw: string, fallbackYear: number): string | null => {
    const parts = raw.split(/[-/]/);
    if (parts.length < 2 || parts.length > 3) return null;
    if (parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;

    const month = Number(parts[0]);
    const day = Number(parts[1]);
    let year = fallbackYear;
    if (parts.length === 3) {
        const y = Number(parts[2]);
        year = y < 100 ? 2000 + y : y;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    // Reject impossible day-of-month (e.g. 2-30) via a round-trip check.
    const probe = new Date(year, month - 1, day);
    if (probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;

    return `${year}-${pad2(month)}-${pad2(day)}`;
};

/** Either date form: relative first, since the two never overlap. */
export const parseDateToken = (body: string, now: Date): string | null =>
    parseRelativeDate(body, now) ?? parseFlexibleDate(body, now.getFullYear());
