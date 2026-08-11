const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

/**
 * Format a release's `YYYY-MM-DD` date as `11 August 2026`.
 *
 * This module must not import or construct `Date`. `new Date('2026-08-11')`
 * parses as UTC midnight, so a reader west of Greenwich would render the
 * previous day, and the server and the browser would disagree across hydration
 * on top of that. Splitting the string is what makes the output identical
 * everywhere, with no clock involved.
 *
 * A string that isn't a well-formed date is returned unchanged.
 */
export const formatReleaseDate = (isoDate: string): string => {
    const [year, month, day] = isoDate.split('-');
    const monthName = MONTH_NAMES[Number(month) - 1];
    if (!year || !day || !monthName) return isoDate;
    return `${Number(day)} ${monthName} ${year}`;
};
