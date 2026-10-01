import { toLocalDateString } from '@/lib/date-utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isPastPromptTime, msUntilPromptTime, shouldCatchUp } from './journal-reminder';

// Pinned west of UTC, where an evening prompt falls on the NEXT UTC day. Under
// UTC a local-clock rule and a UTC-clock rule agree, so only a zone like this
// can tell them apart.
const originalTz = process.env.TZ;
beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
});
afterAll(() => {
    process.env.TZ = originalTz;
});

// 20:30 PDT on Sep 14 is 03:30 UTC on Sep 15.
const eveningInLa = () => new Date('2026-09-15T03:30:00Z');

describe('journal reminder west of UTC', () => {
    it('compares the prompt time with the local clock, not UTC', () => {
        const now = eveningInLa();

        expect(isPastPromptTime('20:00', now)).toBe(true);
        expect(isPastPromptTime('21:00', now)).toBe(false);
        // 03:30 UTC is long before a 17:00 prompt in UTC terms; locally it is after.
        expect(isPastPromptTime('17:00', now)).toBe(true);
    });

    it('arms the timer for the local prompt time', () => {
        expect(msUntilPromptTime('21:00', eveningInLa())).toBe(30 * 60_000);
    });

    it('treats the local day as today, so an evening nudge is not skipped as already shown', () => {
        const now = eveningInLa();
        const today = toLocalDateString(now);

        expect(today).toBe('2026-09-14');
        expect(
            shouldCatchUp({
                enabled: true,
                promptTime: '17:00',
                now,
                today,
                entry: null,
                // Shown yesterday, local time.
                lastPromptedDate: '2026-09-13'
            })
        ).toBe(true);
        expect(
            shouldCatchUp({
                enabled: true,
                promptTime: '17:00',
                now,
                today,
                entry: null,
                lastPromptedDate: '2026-09-14'
            })
        ).toBe(false);
    });
});
