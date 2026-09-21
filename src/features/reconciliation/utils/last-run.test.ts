import { describe, expect, it } from 'vitest';

import { NUDGE_AFTER_DAYS, daysSinceLastRun, shouldNudge } from './last-run';

const TODAY = '2026-09-16';

describe('daysSinceLastRun', () => {
    it('counts whole days back to the last run', () => {
        expect(daysSinceLastRun('2026-08-17', TODAY)).toBe(30);
    });

    it('is zero on the day of a run', () => {
        expect(daysSinceLastRun(TODAY, TODAY)).toBe(0);
    });

    it('is null when the profile has never reconciled', () => {
        // Distinct from 0: "never" is not "today", and the entry screen renders
        // them differently.
        expect(daysSinceLastRun(null, TODAY)).toBeNull();
    });
});

describe('shouldNudge', () => {
    it('nudges when there is work and the last run is older than the interval', () => {
        expect(shouldNudge('2026-08-17', TODAY, true)).toBe(true);
    });

    it('stays quiet when there is nothing to decide', () => {
        // The card must never appear on an empty queue set, however long it has
        // been - it would be a chore with no content.
        expect(shouldNudge('2020-01-01', TODAY, false)).toBe(false);
    });

    it('stays quiet inside the interval', () => {
        expect(shouldNudge('2026-09-10', TODAY, true)).toBe(false);
    });

    it('nudges a profile that has never reconciled', () => {
        expect(shouldNudge(null, TODAY, true)).toBe(true);
    });

    it('nudges exactly on the interval boundary', () => {
        const boundary = '2026-08-17'; // 30 days before TODAY
        expect(daysSinceLastRun(boundary, TODAY)).toBe(NUDGE_AFTER_DAYS);
        expect(shouldNudge(boundary, TODAY, true)).toBe(true);
    });
});
