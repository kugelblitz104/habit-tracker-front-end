export const getFrequencyString = (frequency: number, range: number) => {
    if (frequency === range) return 'daily';
    else if (frequency === 1 && range === 7) return 'weekly';
    else if (frequency === 1 && range === 30) return 'monthly';
    else if (frequency === 1) return `once every ${range} days`;
    else return `${frequency} times every ${range} days`;
    // if (frequency === 1 && range === 365) return 'yearly'
};

/**
 * Calculate the number of weeks between two dates
 */
export const getWeeksDifference = (
    startDate: Date | string,
    endDate: Date | string = new Date()
): number => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const diffTime = end.getTime() - start.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks;
};

/**
 * Parse a YYYY-MM-DD date string as local time (not UTC).
 */
export const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
    return new Date(year, month - 1, day);
};
