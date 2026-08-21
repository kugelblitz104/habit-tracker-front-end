import { describe, expect, it } from 'vitest';
import { parseDateToken, parseFlexibleDate, parseRelativeDate, toISODate } from './date-tokens';

// A Thursday, so weekday arithmetic has a known answer in both directions.
const NOW = new Date(2026, 7, 20, 15, 30);

describe('toISODate', () => {
    it('formats local Y-M-D with zero padding', () => {
        expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
});

describe('parseRelativeDate', () => {
    it('resolves today and its abbreviation', () => {
        expect(parseRelativeDate('today', NOW)).toBe('2026-08-20');
        expect(parseRelativeDate('tod', NOW)).toBe('2026-08-20');
    });

    it('resolves tomorrow and its abbreviation', () => {
        expect(parseRelativeDate('tomorrow', NOW)).toBe('2026-08-21');
        expect(parseRelativeDate('tom', NOW)).toBe('2026-08-21');
    });

    it('resolves +Nd day offsets', () => {
        expect(parseRelativeDate('+3d', NOW)).toBe('2026-08-23');
        expect(parseRelativeDate('+0d', NOW)).toBe('2026-08-20');
    });

    it('resolves the next occurrence of a weekday', () => {
        expect(parseRelativeDate('fri', NOW)).toBe('2026-08-21');
        expect(parseRelativeDate('friday', NOW)).toBe('2026-08-21');
        expect(parseRelativeDate('mon', NOW)).toBe('2026-08-24');
    });

    it('treats a weekday matching today as next week, never today', () => {
        expect(parseRelativeDate('thu', NOW)).toBe('2026-08-27');
    });

    it('is case insensitive', () => {
        expect(parseRelativeDate('FRI', NOW)).toBe('2026-08-21');
    });

    it('returns null for anything else', () => {
        expect(parseRelativeDate('someday', NOW)).toBeNull();
        expect(parseRelativeDate('8-16', NOW)).toBeNull();
        expect(parseRelativeDate('+3', NOW)).toBeNull();
    });
});

describe('parseFlexibleDate', () => {
    it('accepts M-D and M/D with a fallback year', () => {
        expect(parseFlexibleDate('8-16', 2026)).toBe('2026-08-16');
        expect(parseFlexibleDate('8/16', 2026)).toBe('2026-08-16');
    });

    it('maps a two-digit year to 2000+YY', () => {
        expect(parseFlexibleDate('8-16-27', 2026)).toBe('2027-08-16');
    });

    it('accepts an explicit four-digit year', () => {
        expect(parseFlexibleDate('12-25-2026', 2020)).toBe('2026-12-25');
    });

    it('rejects an impossible day of month', () => {
        expect(parseFlexibleDate('2-30', 2026)).toBeNull();
        expect(parseFlexibleDate('4-31', 2026)).toBeNull();
    });

    it('rejects an out-of-range month or day', () => {
        expect(parseFlexibleDate('13-1', 2026)).toBeNull();
        expect(parseFlexibleDate('1-0', 2026)).toBeNull();
    });

    it('rejects malformed shapes', () => {
        expect(parseFlexibleDate('8', 2026)).toBeNull();
        expect(parseFlexibleDate('1-2-3-4', 2026)).toBeNull();
        expect(parseFlexibleDate('8-', 2026)).toBeNull();
        expect(parseFlexibleDate('a-b', 2026)).toBeNull();
    });
});

describe('parseDateToken', () => {
    it('tries the relative form first, then the numeric one', () => {
        expect(parseDateToken('tom', NOW)).toBe('2026-08-21');
        expect(parseDateToken('8-16', NOW)).toBe('2026-08-16');
    });

    it('defaults a yearless numeric date to the year of `now`', () => {
        expect(parseDateToken('1-2', NOW)).toBe('2026-01-02');
    });

    it('returns null when neither form matches', () => {
        expect(parseDateToken('well-being', NOW)).toBeNull();
    });
});
