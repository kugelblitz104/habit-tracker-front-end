import type { JournalEntryRead } from '@/api';
import { describe, expect, it } from 'vitest';
import {
    isPastPromptTime,
    msUntilPromptTime,
    promptMinutes,
    shouldCatchUp,
    type CatchUpInput
} from './journal-reminder';

/** A local-clock instant. Local, deliberately: the prompt time is wall-clock. */
const at = (hours: number, minutes: number) => new Date(2026, 8, 14, hours, minutes, 0, 0);

const entry = (dayQuality: string | null): JournalEntryRead =>
    ({
        id: 1,
        profile_id: 7,
        entry_date: '2026-09-14',
        created_date: '2026-09-14T10:00:00',
        body: 'wrote something',
        day_quality: dayQuality
    }) as JournalEntryRead;

const input = (overrides: Partial<CatchUpInput> = {}): CatchUpInput => ({
    enabled: true,
    promptTime: '17:00',
    now: at(18, 30),
    today: '2026-09-14',
    entry: null,
    lastPromptedDate: null,
    ...overrides
});

describe('promptMinutes', () => {
    it('reads HH:MM and HH:MM:SS', () => {
        expect(promptMinutes('17:00')).toBe(1020);
        expect(promptMinutes('17:00:00')).toBe(1020);
        expect(promptMinutes('09:05')).toBe(545);
        expect(promptMinutes('00:00')).toBe(0);
    });

    it('returns null for an unset or unusable value', () => {
        expect(promptMinutes(null)).toBeNull();
        expect(promptMinutes(undefined)).toBeNull();
        expect(promptMinutes('')).toBeNull();
        expect(promptMinutes('later')).toBeNull();
        expect(promptMinutes('25:00')).toBeNull();
        expect(promptMinutes('17:99')).toBeNull();
    });
});

describe('isPastPromptTime', () => {
    it('is true from the prompt minute onwards', () => {
        expect(isPastPromptTime('17:00', at(17, 0))).toBe(true);
        expect(isPastPromptTime('17:00', at(23, 59))).toBe(true);
    });

    it('is false before it, and whenever no time is set', () => {
        expect(isPastPromptTime('17:00', at(16, 59))).toBe(false);
        expect(isPastPromptTime(null, at(23, 0))).toBe(false);
    });
});

describe('msUntilPromptTime', () => {
    it('counts the milliseconds left before the prompt time today', () => {
        expect(msUntilPromptTime('17:00', at(16, 30))).toBe(30 * 60_000);
    });

    it('returns null once the time has passed, so no timer is armed', () => {
        expect(msUntilPromptTime('17:00', at(17, 0))).toBeNull();
        expect(msUntilPromptTime('17:00', at(21, 0))).toBeNull();
    });

    it('returns null when no usable time is set', () => {
        expect(msUntilPromptTime(null, at(9, 0))).toBeNull();
        expect(msUntilPromptTime('nope', at(9, 0))).toBeNull();
    });
});

describe('shouldCatchUp', () => {
    it('fires when the time has passed and the day is unwritten', () => {
        expect(shouldCatchUp(input())).toBe(true);
    });

    it('fires when the day has prose but no quality word: the check-in is the word', () => {
        expect(shouldCatchUp(input({ entry: entry(null) }))).toBe(true);
    });

    it('does not fire once the day has a quality word', () => {
        expect(shouldCatchUp(input({ entry: entry('good') }))).toBe(false);
    });

    it('does not fire before the prompt time', () => {
        expect(shouldCatchUp(input({ now: at(16, 59) }))).toBe(false);
    });

    it('does not fire when the journal is off for this profile', () => {
        expect(shouldCatchUp(input({ enabled: false }))).toBe(false);
    });

    it('does not fire when no prompt time is set', () => {
        expect(shouldCatchUp(input({ promptTime: null }))).toBe(false);
    });

    it('does not fire while today is still loading, only once it is known', () => {
        expect(shouldCatchUp(input({ entry: undefined }))).toBe(false);
    });

    it('fires once a day, not once a page view', () => {
        expect(shouldCatchUp(input({ lastPromptedDate: '2026-09-14' }))).toBe(false);
        expect(shouldCatchUp(input({ lastPromptedDate: '2026-09-13' }))).toBe(true);
    });
});
