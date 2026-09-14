import { describe, expect, it } from 'vitest';

import {
    dayDifference,
    getBrowserTimeZone,
    isValidDay,
    localDayUtcBounds,
    parseLocalDate,
    parseServerDate,
    relativeDayLabel,
    shiftDay,
    toLocalDateString
} from './date-utils';

/**
 * Date/time plumbing shared by every surface. Nothing here reads the wall clock,
 * and every `Date` is built from local-time components (never an ISO string), so
 * the assertions hold in whatever zone the suite runs in.
 */

describe('toLocalDateString', () => {
    it('zero-pads month and day', () => {
        expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(toLocalDateString(new Date(2026, 9, 9))).toBe('2026-10-09');
        expect(toLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('ignores the time of day', () => {
        expect(toLocalDateString(new Date(2026, 6, 10, 0, 0, 0, 0))).toBe('2026-07-10');
        expect(toLocalDateString(new Date(2026, 6, 10, 23, 59, 59, 999))).toBe('2026-07-10');
    });

    it('reads the local calendar day, so a late-evening instant is not tomorrow', () => {
        // `toISOString().slice(0, 10)` would roll this to the 11th in any zone
        // west of UTC — the reason this helper exists.
        expect(toLocalDateString(new Date(2026, 6, 10, 22, 30))).toBe('2026-07-10');
    });

    it('handles a leap day', () => {
        expect(toLocalDateString(new Date(2024, 1, 29))).toBe('2024-02-29');
    });
});

describe('parseLocalDate', () => {
    it('parses to local midnight of that calendar day', () => {
        const parsed = parseLocalDate('2026-07-10');
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(6);
        expect(parsed.getDate()).toBe(10);
        expect(parsed.getHours()).toBe(0);
        expect(parsed.getMinutes()).toBe(0);
        expect(parsed.getTime()).toBe(new Date(2026, 6, 10).getTime());
    });

    it('does not shift by the timezone offset the way new Date(iso) does', () => {
        // `new Date('2026-07-10')` is UTC midnight; parseLocalDate is LOCAL
        // midnight. Asserting the gap equals the zone offset (rather than a fixed
        // instant) keeps this timezone-agnostic while still proving the shift.
        const local = parseLocalDate('2026-07-10');
        const utcParsed = new Date('2026-07-10');
        expect(local.getTime() - utcParsed.getTime()).toBe(local.getTimezoneOffset() * 60000);
        expect(local.getDate()).toBe(10);
    });

    it('round-trips through toLocalDateString', () => {
        for (const iso of [
            '2026-01-01',
            '2026-02-28',
            '2024-02-29',
            '2026-03-08', // US DST starts
            '2026-07-10',
            '2026-11-01', // US DST ends
            '2026-12-31'
        ]) {
            expect(toLocalDateString(parseLocalDate(iso)), iso).toBe(iso);
        }
    });

    it('rolls an out-of-range month over, exactly as the Date ctor does', () => {
        expect(toLocalDateString(parseLocalDate('2026-13-01'))).toBe('2027-01-01');
    });

    it('yields an Invalid Date for a full datetime string (characterisation)', () => {
        // `split('-')` leaves '10T16:38:36' as the day part, which Number() makes
        // NaN. Every caller passes a date-only column (due_date, scheduled_date,
        // tracker.dated), so this documents the contract rather than a live bug.
        expect(Number.isNaN(parseLocalDate('2026-07-10T16:38:36').getTime())).toBe(true);
    });
});

describe('parseServerDate', () => {
    it('reads a naive server datetime as UTC', () => {
        // FastAPI serializes the API container's UTC clock with no designator.
        expect(parseServerDate('2026-07-10T16:38:36').toISOString()).toBe(
            '2026-07-10T16:38:36.000Z'
        );
    });

    it('keeps fractional seconds when it appends the designator', () => {
        expect(parseServerDate('2026-07-10T16:38:36.7').toISOString()).toBe(
            '2026-07-10T16:38:36.700Z'
        );
        expect(parseServerDate('2026-07-10T16:38:36.7').getUTCMilliseconds()).toBe(700);
        // Python's microsecond form truncates to milliseconds, not rounds.
        expect(parseServerDate('2026-07-10T16:38:36.123456').toISOString()).toBe(
            '2026-07-10T16:38:36.123Z'
        );
    });

    it('leaves a value that already carries Z alone', () => {
        expect(parseServerDate('2026-07-10T16:38:36.700Z').toISOString()).toBe(
            '2026-07-10T16:38:36.700Z'
        );
        // The guard is case-insensitive, and V8 accepts the lowercase designator.
        expect(parseServerDate('2026-07-10T16:38:36z').toISOString()).toBe(
            '2026-07-10T16:38:36.000Z'
        );
    });

    it('leaves an explicit offset alone, with or without the colon', () => {
        expect(parseServerDate('2026-07-10T12:38:36-04:00').toISOString()).toBe(
            '2026-07-10T16:38:36.000Z'
        );
        expect(parseServerDate('2026-07-10T18:38:36+0200').toISOString()).toBe(
            '2026-07-10T16:38:36.000Z'
        );
        expect(parseServerDate('2026-07-10T16:38:36+00:00').toISOString()).toBe(
            '2026-07-10T16:38:36.000Z'
        );
    });

    it('lands a naive value one offset away from the plain local parse', () => {
        // This gap is the timer bug the helper prevents: `new Date(naive)` reads
        // the string as local wall time, so "now - started" was off by the offset.
        const naive = '2026-07-10T16:38:36';
        const asLocalWallTime = new Date(2026, 6, 10, 16, 38, 36);
        expect(parseServerDate(naive).getTime() - asLocalWallTime.getTime()).toBe(
            -asLocalWallTime.getTimezoneOffset() * 60000
        );
    });

    it('treats a date-only value as UTC midnight (characterisation)', () => {
        // '2026-07-10' has no designator, so it becomes '2026-07-10Z'. V8 still
        // parses that, and a bare ISO date is UTC midnight anyway, so appending Z
        // is a no-op here. Only datetime columns are passed in practice.
        expect(parseServerDate('2026-07-10').toISOString()).toBe('2026-07-10T00:00:00.000Z');
    });
});

describe('getBrowserTimeZone', () => {
    it('returns the IANA zone Intl resolves to', () => {
        const zone = getBrowserTimeZone();
        expect(zone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
        expect(zone).toMatch(/^\S+$/);
    });
});

/**
 * These assertions are written to hold in ANY host timezone: the runner's zone
 * is whatever the machine has, and Playwright pins UTC, so anything asserting
 * a literal offset would prove nothing. Each bound is checked by parsing it
 * back as UTC and comparing it to the local midnight it must equal.
 */
const asUtcInstant = (naive: string): number => new Date(`${naive}Z`).getTime();

describe('localDayUtcBounds', () => {
    it('emits naive UTC with no timezone designator', () => {
        const { from, to } = localDayUtcBounds('2026-09-14');

        expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
        expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('starts at the local midnight that opens the day', () => {
        const { from } = localDayUtcBounds('2026-09-14');

        expect(asUtcInstant(from)).toBe(parseLocalDate('2026-09-14').getTime());
    });

    it('ends at the next local midnight, exclusive', () => {
        const { to } = localDayUtcBounds('2026-09-14');

        expect(asUtcInstant(to)).toBe(parseLocalDate('2026-09-15').getTime());
    });

    it('tiles consecutive days without a gap or an overlap', () => {
        const first = localDayUtcBounds('2026-09-14');
        const second = localDayUtcBounds('2026-09-15');

        expect(first.to).toBe(second.from);
    });

    it('spans a whole day even across a DST transition', () => {
        // US spring-forward (Mar 8 2026) and fall-back (Nov 1 2026). In a zone
        // that observes them the span is 23h/25h; elsewhere it stays 24h. Both
        // are correct, and both are wrong if the end were computed as +24h.
        for (const date of ['2026-03-08', '2026-11-01']) {
            const { from, to } = localDayUtcBounds(date);
            const hours = (asUtcInstant(to) - asUtcInstant(from)) / 3_600_000;

            expect([23, 24, 25]).toContain(hours);
            expect(asUtcInstant(to)).toBe(parseLocalDate(shiftDay(date, 1)).getTime());
        }
    });

    it('handles the last day of a year', () => {
        const { to } = localDayUtcBounds('2026-12-31');

        expect(asUtcInstant(to)).toBe(parseLocalDate('2027-01-01').getTime());
    });
});

describe('shiftDay', () => {
    it('moves forward and back one day', () => {
        expect(shiftDay('2026-09-14', 1)).toBe('2026-09-15');
        expect(shiftDay('2026-09-14', -1)).toBe('2026-09-13');
    });

    it('crosses month and year boundaries', () => {
        expect(shiftDay('2026-09-30', 1)).toBe('2026-10-01');
        expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    });

    it('knows February in a leap year', () => {
        expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29');
        expect(shiftDay('2026-02-28', 1)).toBe('2026-03-01');
    });
});

describe('isValidDay', () => {
    it('accepts a real calendar day', () => {
        expect(isValidDay('2026-09-14')).toBe(true);
    });

    it('rejects a day that does not exist, rather than rolling it forward', () => {
        expect(isValidDay('2026-02-31')).toBe(false);
    });

    it('rejects anything that is not YYYY-MM-DD', () => {
        expect(isValidDay('')).toBe(false);
        expect(isValidDay(null)).toBe(false);
        expect(isValidDay('14-09-2026')).toBe(false);
        expect(isValidDay('2026-9-14')).toBe(false);
        expect(isValidDay('yesterday')).toBe(false);
    });
});

describe('dayDifference', () => {
    it('counts forward and back from the reference day', () => {
        expect(dayDifference('2026-09-14', '2026-09-14')).toBe(0);
        expect(dayDifference('2026-09-17', '2026-09-14')).toBe(3);
        expect(dayDifference('2026-09-11', '2026-09-14')).toBe(-3);
    });

    it('crosses month and year boundaries', () => {
        expect(dayDifference('2026-10-01', '2026-09-29')).toBe(2);
        expect(dayDifference('2025-12-31', '2026-01-02')).toBe(-2);
    });

    it('counts whole days across a DST transition', () => {
        // A 23- or 25-hour day would truncate to the wrong count; these must
        // read as one day in every zone, whether or not it observes DST.
        expect(dayDifference('2026-03-09', '2026-03-08')).toBe(1);
        expect(dayDifference('2026-11-02', '2026-11-01')).toBe(1);
        // A whole month spanning a transition still counts as calendar days.
        expect(dayDifference('2026-04-08', '2026-03-08')).toBe(31);
    });
});

describe('relativeDayLabel', () => {
    it('names the three days around today', () => {
        expect(relativeDayLabel('2026-09-14', '2026-09-14')).toBe('Today');
        expect(relativeDayLabel('2026-09-13', '2026-09-14')).toBe('Yesterday');
        expect(relativeDayLabel('2026-09-15', '2026-09-14')).toBe('Tomorrow');
    });

    it('counts the days for anything further off', () => {
        expect(relativeDayLabel('2026-09-12', '2026-09-14')).toBe('2 days ago');
        expect(relativeDayLabel('2026-08-15', '2026-09-14')).toBe('30 days ago');
        expect(relativeDayLabel('2026-09-16', '2026-09-14')).toBe('In 2 days');
    });

    it('always returns a label, so a caller can use it as a heading', () => {
        for (const offset of [-400, -31, -2, -1, 0, 1, 2, 31, 400]) {
            expect(relativeDayLabel(shiftDay('2026-09-14', offset), '2026-09-14')).toBeTruthy();
        }
    });

    it('works across a month boundary', () => {
        expect(relativeDayLabel('2026-08-31', '2026-09-01')).toBe('Yesterday');
        expect(relativeDayLabel('2026-08-29', '2026-09-01')).toBe('3 days ago');
    });
});
