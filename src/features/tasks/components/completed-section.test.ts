import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatClosed } from './completed-section';

// Pinned west of UTC: under UTC both the right and the wrong parse give the
// same day, so a test run there proves nothing.
const originalTz = process.env.TZ;
beforeAll(() => {
    process.env.TZ = 'America/New_York';
});
afterAll(() => {
    process.env.TZ = originalTz;
});

describe('formatClosed', () => {
    it('names the local day for a task closed on an Eastern evening', () => {
        // 21:00 EDT on Sep 8 is stored as 01:00 UTC on Sep 9.
        expect(formatClosed('2026-09-09T01:00:00')).toBe(formatClosed('2026-09-08T16:00:00'));
        expect(new Date('2026-09-09T01:00:00Z').getDate()).toBe(8);
    });

    it('is null without a closed date', () => {
        expect(formatClosed(null)).toBeNull();
        expect(formatClosed(undefined)).toBeNull();
    });
});
