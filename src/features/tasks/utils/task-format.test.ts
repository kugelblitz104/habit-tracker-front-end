import { describe, expect, it } from 'vitest';

import { formatCompactTime, formatShortDate, getDueInfo, getScheduledLabel } from './task-format';

/**
 * Chip label formatting. `getDueInfo` takes an injectable `today` precisely so
 * these cases can pin it; every Date is built from local components so the suite
 * is timezone-agnostic.
 *
 * Anchor day: Sunday 15 March 2026.
 */
const TODAY = new Date(2026, 2, 15);

/** The middle dot `getScheduledLabel` joins with (U+00B7). */
const DOT = '·';

describe('formatShortDate', () => {
    it('renders month abbreviation plus an ordinal day', () => {
        expect(formatShortDate(new Date(2026, 6, 8))).toBe('Jul 8th');
        expect(formatShortDate(new Date(2026, 2, 15))).toBe('Mar 15th');
    });

    it('abbreviates every month to three letters', () => {
        const labels = Array.from({ length: 12 }, (_, month) =>
            formatShortDate(new Date(2026, month, 1))
        );
        expect(labels).toEqual([
            'Jan 1st',
            'Feb 1st',
            'Mar 1st',
            'Apr 1st',
            'May 1st',
            'Jun 1st',
            'Jul 1st',
            'Aug 1st',
            'Sep 1st',
            'Oct 1st',
            'Nov 1st',
            'Dec 1st'
        ]);
    });

    it('omits the year entirely', () => {
        expect(formatShortDate(new Date(1999, 6, 8))).toBe('Jul 8th');
        expect(formatShortDate(new Date(2030, 6, 8))).toBe('Jul 8th');
    });

    it('ignores the time of day', () => {
        expect(formatShortDate(new Date(2026, 6, 8, 23, 59))).toBe('Jul 8th');
    });

    describe('ordinal suffixes', () => {
        const dayLabel = (day: number): string =>
            formatShortDate(new Date(2026, 0, day)).replace('Jan ', '');

        it('uses st, nd, rd then th for the first four days', () => {
            expect([1, 2, 3, 4].map(dayLabel)).toEqual(['1st', '2nd', '3rd', '4th']);
        });

        it('keeps the teens on th, including 11th, 12th and 13th', () => {
            expect([11, 12, 13].map(dayLabel)).toEqual(['11th', '12th', '13th']);
        });

        it('picks st, nd and rd back up in the twenties', () => {
            expect([21, 22, 23].map(dayLabel)).toEqual(['21st', '22nd', '23rd']);
        });

        it('covers every day of a 31-day month', () => {
            const expected = [
                '1st',
                '2nd',
                '3rd',
                '4th',
                '5th',
                '6th',
                '7th',
                '8th',
                '9th',
                '10th',
                '11th',
                '12th',
                '13th',
                '14th',
                '15th',
                '16th',
                '17th',
                '18th',
                '19th',
                '20th',
                '21st',
                '22nd',
                '23rd',
                '24th',
                '25th',
                '26th',
                '27th',
                '28th',
                '29th',
                '30th',
                '31st'
            ];
            expect(expected.map((_, index) => dayLabel(index + 1))).toEqual(expected);
        });
    });
});

describe('formatCompactTime', () => {
    it('returns null for a missing time', () => {
        expect(formatCompactTime(null)).toBeNull();
        expect(formatCompactTime(undefined)).toBeNull();
        expect(formatCompactTime('')).toBeNull();
    });

    it('returns null for anything it cannot parse', () => {
        expect(formatCompactTime('later')).toBeNull();
        expect(formatCompactTime('9')).toBeNull();
        expect(formatCompactTime('9:5')).toBeNull();
        expect(formatCompactTime(':30')).toBeNull();
        expect(formatCompactTime('070:30')).toBeNull();
    });

    it('returns null for an out-of-range hour or minute', () => {
        expect(formatCompactTime('24:00')).toBeNull();
        expect(formatCompactTime('99:00')).toBeNull();
        expect(formatCompactTime('12:60')).toBeNull();
        expect(formatCompactTime('12:99')).toBeNull();
    });

    it('renders midnight as 12:00a and noon as 12:00p', () => {
        expect(formatCompactTime('00:00')).toBe('12:00a');
        expect(formatCompactTime('00:30')).toBe('12:30a');
        expect(formatCompactTime('12:00')).toBe('12:00p');
        expect(formatCompactTime('12:15')).toBe('12:15p');
    });

    it('strips the leading zero from the hour but keeps it on the minutes', () => {
        expect(formatCompactTime('09:30')).toBe('9:30a');
        expect(formatCompactTime('09:05')).toBe('9:05a');
        expect(formatCompactTime('9:30')).toBe('9:30a');
    });

    it('converts afternoon hours to 12-hour with a p suffix', () => {
        expect(formatCompactTime('13:00')).toBe('1:00p');
        expect(formatCompactTime('14:00')).toBe('2:00p');
        expect(formatCompactTime('23:59')).toBe('11:59p');
    });

    it('ignores anything after the minutes, including seconds', () => {
        expect(formatCompactTime('14:05:00')).toBe('2:05p');
        expect(formatCompactTime('14:05:59.500')).toBe('2:05p');
    });

    it('ignores a trailing meridiem instead of honouring it (characterisation)', () => {
        // The regex only reads HH:MM off the front, so '08:30 PM' formats as
        // morning. The API only ever sends 24-hour HH:MM[:SS], so this is
        // unreachable today — recorded so a future 12-hour input shows up here.
        expect(formatCompactTime('08:30 PM')).toBe('8:30a');
    });
});

describe('getDueInfo', () => {
    it('returns null without a due date', () => {
        expect(getDueInfo(null, TODAY)).toBeNull();
        expect(getDueInfo(undefined, TODAY)).toBeNull();
        expect(getDueInfo('', TODAY)).toBeNull();
    });

    it('marks today as hot', () => {
        expect(getDueInfo('2026-03-15', TODAY)).toEqual({ label: 'due today', hot: true });
    });

    it('marks anything earlier as overdue and hot, however far back', () => {
        expect(getDueInfo('2026-03-14', TODAY)).toEqual({ label: 'overdue', hot: true });
        expect(getDueInfo('2019-01-01', TODAY)).toEqual({ label: 'overdue', hot: true });
    });

    it('marks tomorrow as hot with its own label', () => {
        expect(getDueInfo('2026-03-16', TODAY)).toEqual({ label: 'due tomorrow', hot: true });
    });

    it('falls back to a cool short-date label from two days out', () => {
        expect(getDueInfo('2026-03-17', TODAY)).toEqual({ label: 'due Mar 17th', hot: false });
        expect(getDueInfo('2026-04-01', TODAY)).toEqual({ label: 'due Apr 1st', hot: false });
        expect(getDueInfo('2027-12-25', TODAY)).toEqual({ label: 'due Dec 25th', hot: false });
    });

    it('rolls tomorrow across a month boundary', () => {
        const endOfMarch = new Date(2026, 2, 31);
        expect(getDueInfo('2026-04-01', endOfMarch)).toEqual({
            label: 'due tomorrow',
            hot: true
        });
    });

    it('rolls tomorrow across a year boundary', () => {
        const newYearsEve = new Date(2026, 11, 31);
        expect(getDueInfo('2027-01-01', newYearsEve)).toEqual({
            label: 'due tomorrow',
            hot: true
        });
    });

    it('uses the local calendar day of `today`, not its time', () => {
        expect(getDueInfo('2026-03-15', new Date(2026, 2, 15, 0, 0, 1))).toEqual({
            label: 'due today',
            hot: true
        });
        expect(getDueInfo('2026-03-15', new Date(2026, 2, 15, 23, 59, 59))).toEqual({
            label: 'due today',
            hot: true
        });
    });

    it('garbles a datetime due date rather than rejecting it (characterisation)', () => {
        // The comparisons are plain string compares against a YYYY-MM-DD `today`,
        // so a value carrying a time part sorts after it and then goes through
        // parseLocalDate, which yields an Invalid Date. `due_date` is a DATE column
        // server-side, so this is unreachable — it pins the date-only contract.
        expect(getDueInfo('2026-03-15T00:00:00', TODAY)).toEqual({
            label: 'due undefined NaNth',
            hot: false
        });
    });
});

describe('getScheduledLabel', () => {
    it('returns null without a scheduled date', () => {
        expect(getScheduledLabel(null)).toBeNull();
        expect(getScheduledLabel(undefined, '14:00')).toBeNull();
        expect(getScheduledLabel('')).toBeNull();
    });

    it('renders date only when there is no time', () => {
        expect(getScheduledLabel('2026-07-08')).toBe(`scheduled ${DOT} Jul 8th`);
        expect(getScheduledLabel('2026-07-08', null)).toBe(`scheduled ${DOT} Jul 8th`);
        expect(getScheduledLabel('2026-07-08', '')).toBe(`scheduled ${DOT} Jul 8th`);
    });

    it('appends the compact time when there is one', () => {
        expect(getScheduledLabel('2026-07-08', '14:00')).toBe(
            `scheduled ${DOT} Jul 8th ${DOT} 2:00p`
        );
        expect(getScheduledLabel('2026-07-08', '09:05:00')).toBe(
            `scheduled ${DOT} Jul 8th ${DOT} 9:05a`
        );
    });

    it('drops an unparseable time and keeps the date', () => {
        expect(getScheduledLabel('2026-07-08', 'sometime')).toBe(`scheduled ${DOT} Jul 8th`);
        expect(getScheduledLabel('2026-07-08', '25:00')).toBe(`scheduled ${DOT} Jul 8th`);
    });

    it('parses the date locally, so the day never shifts by a timezone', () => {
        // `new Date('2026-01-01')` would render 'Dec 31st' anywhere west of UTC.
        expect(getScheduledLabel('2026-01-01')).toBe(`scheduled ${DOT} Jan 1st`);
        expect(getScheduledLabel('2026-12-31')).toBe(`scheduled ${DOT} Dec 31st`);
    });
});
