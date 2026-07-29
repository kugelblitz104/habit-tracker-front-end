import { describe, expect, it } from 'vitest';

import {
    COUNTDOWN_GROUPS,
    countdownHero,
    getCountdown,
    groupColor,
    occurrenceLabel,
    repeatLabel,
    type Countdown
} from './countdown';

/**
 * Pure countdown math. Every case pins `now` explicitly — `getCountdown` and
 * `occurrenceLabel` both take it precisely so this is possible.
 *
 * Anchor instant: Sunday 15 March 2026, 12:00 local. Constructed with the
 * local-time Date ctor (not an ISO string) so the suite is timezone-agnostic.
 */
const NOW = new Date(2026, 2, 15, 12, 0, 0);

/** A `now` inside February, for the month-length clamping cases. */
const NOW_FEB = new Date(2026, 1, 10, 12, 0, 0);

/** Non-null assert, so the tests read cleanly under `noUncheckedIndexedAccess`. */
const at = (date: string, time?: string | null, now: Date = NOW, repeat?: never): Countdown => {
    const c = getCountdown(date, time ?? null, now, repeat);
    expect(c).not.toBeNull();
    return c!;
};

describe('getCountdown', () => {
    it('returns null without a date', () => {
        expect(getCountdown(null, null, NOW)).toBeNull();
        expect(getCountdown(undefined, '09:00', NOW)).toBeNull();
        expect(getCountdown('', null, NOW)).toBeNull();
    });

    describe('date-only targets', () => {
        it('treats today as end-of-day, so midday is not yet overdue', () => {
            const c = at('2026-03-15');
            expect(c.overdue).toBe(false);
            expect(c.daysUntil).toBe(0);
            expect(c.label).toBe('due today');
            expect(c.group).toBe('today');
            expect(c.urgency).toBe('now');
        });

        it('labels tomorrow by name and keeps it urgent', () => {
            const c = at('2026-03-16');
            expect(c.daysUntil).toBe(1);
            expect(c.label).toBe('tomorrow');
            expect(c.group).toBe('week');
            expect(c.urgency).toBe('now');
        });

        it('counts whole calendar days out', () => {
            const c = at('2026-03-18');
            expect(c.daysUntil).toBe(3);
            expect(c.label).toBe('3d');
        });

        it('reports overdue days as a positive magnitude', () => {
            const c = at('2026-03-13');
            expect(c.overdue).toBe(true);
            expect(c.daysUntil).toBe(-2);
            expect(c.label).toBe('2d overdue');
            expect(c.group).toBe('overdue');
            expect(c.urgency).toBe('overdue');
        });
    });

    describe('group and urgency boundaries', () => {
        // group: today (0) | week (1-7) | later (8+)
        // urgency: now (0-1) | soon (2-7) | later (8+)
        it('puts day 7 in the week group and soon urgency', () => {
            const c = at('2026-03-22');
            expect(c.daysUntil).toBe(7);
            expect(c.group).toBe('week');
            expect(c.urgency).toBe('soon');
        });

        it('pushes day 8 out to later on both axes', () => {
            const c = at('2026-03-23');
            expect(c.daysUntil).toBe(8);
            expect(c.group).toBe('later');
            expect(c.urgency).toBe('later');
        });

        it('splits urgency at day 2 while both stay in the week group', () => {
            expect(at('2026-03-16').urgency).toBe('now');
            expect(at('2026-03-17').urgency).toBe('soon');
            expect(at('2026-03-17').group).toBe('week');
        });
    });

    describe('timed targets', () => {
        it('counts down in hours and minutes on the due day', () => {
            const c = at('2026-03-15', '17:30');
            expect(c.overdue).toBe(false);
            expect(c.label).toBe('5h 30m');
        });

        it('drops to minutes only within the hour', () => {
            expect(at('2026-03-15', '12:45').label).toBe('45m');
        });

        it('reads plain "overdue" when the time has passed today', () => {
            const c = at('2026-03-15', '09:00');
            expect(c.overdue).toBe(true);
            expect(c.daysUntil).toBe(0);
            expect(c.label).toBe('overdue');
            expect(c.group).toBe('overdue');
        });

        it('ignores the time for the day count on future days', () => {
            expect(at('2026-03-18', '08:00').label).toBe('3d');
        });
    });

    describe('recurrence', () => {
        it('leaves a still-upcoming anchor alone and reports recurs: false', () => {
            const c = getCountdown('2026-06-20', null, NOW, 'yearly')!;
            expect(c.recurs).toBe(false);
            expect(c.overdue).toBe(false);
        });

        it('rolls a passed yearly anchor to this year', () => {
            const c = getCountdown('2000-06-20', null, NOW, 'yearly')!;
            expect(c.recurs).toBe(true);
            expect(c.overdue).toBe(false);
            // 15 Mar -> 20 Jun 2026: 16 (Mar) + 30 (Apr) + 31 (May) + 20 = 97
            expect(c.daysUntil).toBe(97);
        });

        it('rolls a passed weekly anchor to the next matching weekday', () => {
            const c = getCountdown('2026-03-02', null, NOW, 'weekly')!;
            expect(c.recurs).toBe(true);
            expect(c.daysUntil).toBe(1);
            expect(c.label).toBe('tomorrow');
        });

        it('clamps a day-31 monthly anchor into a short month', () => {
            const c = getCountdown('2026-01-31', null, NOW_FEB, 'monthly')!;
            expect(c.recurs).toBe(true);
            // 10 Feb -> 28 Feb 2026 (2026 is not a leap year)
            expect(c.daysUntil).toBe(18);
        });

        it('tracks the nth weekday rather than the date', () => {
            // Anchor is the 1st Monday of March 2026; that has passed, so the
            // next occurrence is the 1st Monday of April.
            const c = getCountdown('2026-03-02', null, NOW, 'monthly_weekday')!;
            expect(c.recurs).toBe(true);
            // 15 Mar -> 6 Apr 2026
            expect(c.daysUntil).toBe(22);
        });

        it('never reports a recurring countdown as overdue', () => {
            for (const repeat of ['weekly', 'monthly', 'monthly_weekday', 'yearly'] as const) {
                const c = getCountdown('2019-01-07', null, NOW, repeat)!;
                expect(c.overdue, repeat).toBe(false);
            }
        });
    });
});

describe('countdownHero', () => {
    const hero = (date: string, time?: string | null) => countdownHero(at(date, time));

    it('collapses today and overdue-today to a single word', () => {
        expect(hero('2026-03-15')).toEqual({ value: 'Today', unit: null });
        expect(hero('2026-03-15', '09:00')).toEqual({ value: 'Overdue', unit: null });
    });

    it('singularises one day', () => {
        expect(hero('2026-03-16')).toEqual({ value: '1', unit: 'day' });
        expect(hero('2026-03-14')).toEqual({ value: '1', unit: 'day overdue' });
    });

    it('pluralises beyond one day', () => {
        expect(hero('2026-03-18')).toEqual({ value: '3', unit: 'days' });
        expect(hero('2026-03-12')).toEqual({ value: '3', unit: 'days overdue' });
    });
});

describe('occurrenceLabel', () => {
    it('returns null when there is no recurrence', () => {
        expect(occurrenceLabel('2026-03-15', null, NOW)).toBeNull();
        expect(occurrenceLabel('2026-03-15', 'none', NOW)).toBeNull();
    });

    it('returns null before the first occurrence has come round', () => {
        expect(occurrenceLabel('2026-06-20', 'yearly', NOW)).toBeNull();
    });

    it('counts years for a yearly anchor', () => {
        expect(occurrenceLabel('2000-06-20', 'yearly', NOW)).toBe('26th');
    });

    it('counts weeks for a weekly anchor', () => {
        expect(occurrenceLabel('2026-03-02', 'weekly', NOW)).toBe('2nd');
    });

    it('counts months for both monthly rules', () => {
        expect(occurrenceLabel('2026-01-15', 'monthly', NOW)).toBe('2nd');
        expect(occurrenceLabel('2026-01-05', 'monthly_weekday', NOW)).toBe('3rd');
    });

    it('uses the right ordinal suffix in the teens', () => {
        // 2015 -> 2026 is 11 years, which must read "11th", not "11st".
        expect(occurrenceLabel('2015-06-20', 'yearly', NOW)).toBe('11th');
        expect(occurrenceLabel('2005-06-20', 'yearly', NOW)).toBe('21st');
    });
});

describe('repeatLabel', () => {
    it('names the simple rules', () => {
        expect(repeatLabel('weekly')).toBe('Weekly');
        expect(repeatLabel('monthly')).toBe('Monthly');
        expect(repeatLabel('yearly')).toBe('Yearly');
    });

    it('returns null for no rule', () => {
        expect(repeatLabel(null)).toBeNull();
        expect(repeatLabel('none')).toBeNull();
        expect(repeatLabel(undefined)).toBeNull();
    });

    it('describes the nth weekday, falling back without an anchor', () => {
        // 2 March 2026 is the 1st Monday.
        expect(repeatLabel('monthly_weekday', '2026-03-02')).toBe('Monthly (1st Mon)');
        // 30 March 2026 is the 5th Monday -> "last".
        expect(repeatLabel('monthly_weekday', '2026-03-30')).toBe('Monthly (last Mon)');
        expect(repeatLabel('monthly_weekday')).toBe('Monthly');
    });
});

describe('groupColor', () => {
    it('resolves a color for every group', () => {
        for (const { key, color } of COUNTDOWN_GROUPS) {
            expect(groupColor(key)).toBe(color);
        }
    });
});
