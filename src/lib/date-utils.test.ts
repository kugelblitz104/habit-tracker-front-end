import { describe, expect, it } from 'vitest';

import {
    getBrowserTimeZone,
    parseLocalDate,
    parseServerDate,
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
