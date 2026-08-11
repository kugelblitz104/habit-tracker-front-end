import { describe, expect, it } from 'vitest';
import { formatReleaseDate } from './format-release-date';

describe('formatReleaseDate', () => {
    it('formats a date as day, month name, year', () => {
        expect(formatReleaseDate('2026-08-11')).toBe('11 August 2026');
    });

    it('strips the leading zero from a single-digit day', () => {
        expect(formatReleaseDate('2026-01-05')).toBe('5 January 2026');
    });

    // Both ends of the month-name array, so an off-by-one in the index can't pass.
    it('handles the first and last months', () => {
        expect(formatReleaseDate('2026-01-31')).toBe('31 January 2026');
        expect(formatReleaseDate('2026-12-01')).toBe('1 December 2026');
    });

    it('returns a malformed date unchanged', () => {
        expect(formatReleaseDate('not a date')).toBe('not a date');
        expect(formatReleaseDate('2026-13-01')).toBe('2026-13-01');
        expect(formatReleaseDate('2026-08')).toBe('2026-08');
    });
});
