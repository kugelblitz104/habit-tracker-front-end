import { describe, expect, it } from 'vitest';

import { formatAbsolute, formatRelative } from './relative-time';

/**
 * Relative/absolute rendering of a server timestamp. Every case passes `now`
 * explicitly, so nothing here reads the wall clock. The relative labels compare
 * instants, so they hold in any zone; the absolute ones are asserted by shape
 * rather than by literal text, since the zone the suite runs in decides which
 * calendar day an instant falls on.
 */

/** A naive server datetime, the shape FastAPI actually serializes. */
const server = (value: string) => value;
/** The instant that server value denotes (its clock runs UTC). */
const at = (value: string) => new Date(`${value}Z`);

const NOW = at('2026-09-09T12:00:00');

const minutes = (n: number) => n * 60_000;
const hours = (n: number) => n * 3_600_000;
const days = (n: number) => n * 86_400_000;
const before = (ms: number) => new Date(NOW.getTime() - ms).toISOString().replace('Z', '');

describe('formatRelative', () => {
    it('returns null for a missing value', () => {
        expect(formatRelative(null, NOW)).toBeNull();
        expect(formatRelative(undefined, NOW)).toBeNull();
        expect(formatRelative('', NOW)).toBeNull();
    });

    it('returns null for an unparseable value rather than "NaNd ago"', () => {
        expect(formatRelative('not a date', NOW)).toBeNull();
    });

    it('reads a naive value as UTC, not as local wall time', () => {
        // The whole point of routing through parseServerDate: read as local wall
        // time this is one zone offset away, which in most zones lands in a
        // different bucket entirely.
        expect(formatRelative(server('2026-09-09T11:00:00'), NOW)).toBe('1h ago');
    });

    it('says "just now" inside the first minute', () => {
        expect(formatRelative(before(0), NOW)).toBe('just now');
        expect(formatRelative(before(59_000), NOW)).toBe('just now');
    });

    it('clamps a future timestamp to "just now" instead of counting up', () => {
        // Clock skew between the API host and the browser degrades to something
        // legible rather than "in 4h".
        expect(formatRelative(server('2026-09-09T16:00:00'), NOW)).toBe('just now');
    });

    it('counts whole minutes up to the hour', () => {
        expect(formatRelative(before(minutes(1)), NOW)).toBe('1m ago');
        expect(formatRelative(before(minutes(59) + 59_000), NOW)).toBe('59m ago');
    });

    it('counts whole hours up to the day', () => {
        expect(formatRelative(before(hours(1)), NOW)).toBe('1h ago');
        expect(formatRelative(before(hours(23) + minutes(59)), NOW)).toBe('23h ago');
    });

    it('counts whole days up to the absolute cutoff', () => {
        expect(formatRelative(before(days(1)), NOW)).toBe('1d ago');
        expect(formatRelative(before(days(5)), NOW)).toBe('5d ago');
        expect(formatRelative(before(days(29) + hours(23)), NOW)).toBe('29d ago');
    });

    it('floors each unit rather than rounding, so nothing reads ahead of itself', () => {
        // 90 minutes is "1h ago"; rounding would call it 2h and claim more
        // elapsed time than there is.
        expect(formatRelative(before(minutes(90)), NOW)).toBe('1h ago');
        expect(formatRelative(before(hours(47)), NOW)).toBe('1d ago');
    });

    it('falls back to a short date once "Nd ago" stops being readable', () => {
        expect(formatRelative(before(days(30)), NOW)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
        expect(formatRelative(before(days(200)), NOW)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it('carries the year in the fallback only when it is not the current one', () => {
        expect(formatRelative(before(days(400)), NOW)).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 2025$/);
    });

    it('leaves a value that already carries a designator alone', () => {
        expect(formatRelative('2026-09-09T11:00:00Z', NOW)).toBe('1h ago');
        expect(formatRelative('2026-09-09T07:00:00-04:00', NOW)).toBe('1h ago');
    });
});

describe('formatAbsolute', () => {
    it('returns null for a missing or unparseable value', () => {
        expect(formatAbsolute(null)).toBeNull();
        expect(formatAbsolute(undefined)).toBeNull();
        expect(formatAbsolute('')).toBeNull();
        expect(formatAbsolute('not a date')).toBeNull();
    });

    it('renders a full date and a time of day', () => {
        const label = formatAbsolute(server('2026-09-03T18:14:00'));
        expect(label).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s?(AM|PM)$/);
    });

    it('renders in the browser zone, so it agrees with the relative label', () => {
        // Not the profile's timezone and not UTC: the reader wants to know when
        // this happened by their own clock.
        const value = server('2026-09-03T18:14:00');
        const local = at('2026-09-03T18:14:00');
        expect(formatAbsolute(value)).toContain(String(local.getFullYear()));
        expect(formatAbsolute(value)).toContain(
            local.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        );
    });
});
