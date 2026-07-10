export const getFrequencyString = (frequency: number, range: number) => {
    if (frequency === range) return 'daily';
    else if (frequency === 1 && range === 7) return 'weekly';
    else if (frequency === 1 && range === 30) return 'monthly';
    else if (frequency === 1) return `once every ${range} days`;
    else return `${frequency} times every ${range} days`;
    // if (frequency === 1 && range === 365) return 'yearly'
};

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
