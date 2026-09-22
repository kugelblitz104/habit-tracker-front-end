import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_SKELETON_ROWS,
    readRememberedHabitCount,
    rememberHabitCount
} from './remembered-habit-count';

/** vitest runs in `node`, which has no localStorage, so stand one up. */
const stubStorage = (overrides: Partial<Storage> = {}) => {
    const store = new Map<string, string>();
    const storage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        ...overrides
    } as Storage;
    vi.stubGlobal('localStorage', storage);
    return store;
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('readRememberedHabitCount', () => {
    it('round-trips a count for its own profile', () => {
        stubStorage();

        rememberHabitCount(3, 8);

        expect(readRememberedHabitCount(3)).toBe(8);
    });

    it('keeps profiles apart', () => {
        stubStorage();

        rememberHabitCount(3, 8);

        expect(readRememberedHabitCount(4)).toBe(DEFAULT_SKELETON_ROWS);
    });

    it('falls back when nothing is stored, or the profile is unresolved', () => {
        stubStorage();

        expect(readRememberedHabitCount(3)).toBe(DEFAULT_SKELETON_ROWS);
        expect(readRememberedHabitCount(null)).toBe(DEFAULT_SKELETON_ROWS);
        expect(readRememberedHabitCount(undefined)).toBe(DEFAULT_SKELETON_ROWS);
    });

    it('falls back on a corrupt value rather than painting NaN rows', () => {
        const store = stubStorage();
        store.set('habits_count_3', 'not a number');

        expect(readRememberedHabitCount(3)).toBe(DEFAULT_SKELETON_ROWS);
    });

    it('caps an absurd stored count', () => {
        const store = stubStorage();
        store.set('habits_count_3', '9000');

        expect(readRememberedHabitCount(3)).toBe(25);
    });

    it('does not store a zero count, so an empty profile keeps the default', () => {
        stubStorage();

        rememberHabitCount(3, 0);

        expect(readRememberedHabitCount(3)).toBe(DEFAULT_SKELETON_ROWS);
    });

    it('survives storage throwing, which is what a private window does', () => {
        stubStorage({
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            }
        });

        expect(() => rememberHabitCount(3, 8)).not.toThrow();
        expect(readRememberedHabitCount(3)).toBe(DEFAULT_SKELETON_ROWS);
    });
});
