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
