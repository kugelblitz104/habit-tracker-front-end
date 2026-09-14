/**
 * The browser's IANA timezone name (e.g. 'America/New_York'). Sent as the `tz`
 * query param so the server computes "today" in the user's zone rather than the
 * server's (UTC) clock.
 */
export const getBrowserTimeZone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Format a Date as YYYY-MM-DD in local time.
 */
export const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Parse a YYYY-MM-DD date string as local time (not UTC).
 */
export const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
    return new Date(year, month - 1, day);
};

/**
 * Parse a datetime string returned by the API. FastAPI serializes naive
 * datetimes (the API container's clock runs UTC) with NO timezone designator,
 * e.g. "2026-07-10T16:38:36.7" — the browser would otherwise read that as local
 * time and skew any "now − then" math by the UTC offset. Append 'Z' so it's
 * parsed as the UTC instant it actually is; values that already carry an offset
 * or 'Z' are left untouched. Critical for live timer elapsed calculations.
 */
export const parseServerDate = (value: string): Date => {
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
    return new Date(hasTz ? value : `${value}Z`);
};

/** The calendar day `days` away from a `YYYY-MM-DD` day (negative goes back). */
export const shiftDay = (date: string, days: number): string => {
    const shifted = parseLocalDate(date);
    shifted.setDate(shifted.getDate() + days);
    return toLocalDateString(shifted);
};

/**
 * Whether a string is a real `YYYY-MM-DD` day. The round-trip is what rejects
 * "2026-02-31": `parseLocalDate` rolls it forward to March 3 rather than
 * returning an invalid date, so only re-formatting catches it. Use it on any
 * day that came from a URL, a query string or a half-typed date input.
 */
export const isValidDay = (date: string | null | undefined): boolean =>
    !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && toLocalDateString(parseLocalDate(date)) === date;

/**
 * Whole calendar days from `from` to `date`, negative for a day in the past.
 *
 * Rounded rather than truncated because a DST transition inside the span makes
 * it 23 or 25 hours, which integer division would report as the wrong day.
 */
export const dayDifference = (date: string, from: string): number =>
    Math.round((parseLocalDate(date).getTime() - parseLocalDate(from).getTime()) / 86_400_000);

/**
 * How far a `YYYY-MM-DD` day is from another, in words: "Today", "Yesterday",
 * "Tomorrow", "3 days ago", "In 2 days". Always returns something, so a caller
 * can use it as a heading.
 */
export const relativeDayLabel = (date: string, today: string): string => {
    const days = dayDifference(date, today);
    if (days === 0) return 'Today';
    if (days === -1) return 'Yesterday';
    if (days === 1) return 'Tomorrow';
    return days < 0 ? `${-days} days ago` : `In ${days} days`;
};

/** A half-open `[from, to)` instant range, naive UTC. */
export type UtcDayBounds = {
    /** Inclusive lower bound, `YYYY-MM-DDTHH:MM:SS`, no designator. */
    from: string;
    /** Exclusive upper bound, same shape. */
    to: string;
};

/**
 * Naive-UTC wire format: the instant in UTC with the trailing "Z" removed.
 * The API stores and compares naive UTC datetimes and emits no designator (see
 * `parseServerDate`), so a bound carrying a "Z" would be rejected as an
 * offset-aware value by the server's naive comparison.
 */
const toNaiveUtc = (instant: Date): string => instant.toISOString().slice(0, 19);

/**
 * The UTC instants bounding one **local** calendar day, half-open.
 *
 * Server timestamps are naive UTC, so a task closed at 9pm Eastern on the 10th
 * is stored at 01:00 on the 11th. Filtering on the UTC day would file it under
 * the wrong date, so a date-bounded query sends the interval it actually means.
 * Half-open so consecutive days tile without double-counting a row that landed
 * exactly on midnight.
 *
 * The same window serves every timestamp column, so the fields are named for
 * the interval rather than for one of them.
 *
 * The end is local midnight of the next day computed with `setDate`, not
 * `+24h`, so a DST transition inside the day still yields the real 23- or
 * 25-hour span.
 */
export const localDayUtcBounds = (date: string): UtcDayBounds => {
    const start = parseLocalDate(date);
    const end = parseLocalDate(date);
    end.setDate(end.getDate() + 1);
    return { from: toNaiveUtc(start), to: toNaiveUtc(end) };
};

/** Format a Date as a value for <input type="datetime-local"> (local wall time, minute precision). */
export const toDateTimeLocal = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours()
    )}:${pad(date.getMinutes())}`;
};
