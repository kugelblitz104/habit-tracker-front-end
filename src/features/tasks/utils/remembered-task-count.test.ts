import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_SKELETON_ROWS,
    readRememberedTaskCount,
    rememberTaskCount
} from './remembered-task-count';

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

describe('remembered task count', () => {
    it('round-trips a count per profile', () => {
        stubStorage();

        rememberTaskCount(3, 8);

        expect(readRememberedTaskCount(3)).toBe(8);
        expect(readRememberedTaskCount(4)).toBe(DEFAULT_SKELETON_ROWS);
    });

    it('falls back on a missing profile, a corrupt value, or an absurd one', () => {
        const store = stubStorage();
        store.set('tasks_count_3', 'nope');
        expect(readRememberedTaskCount(null)).toBe(DEFAULT_SKELETON_ROWS);
        expect(readRememberedTaskCount(3)).toBe(DEFAULT_SKELETON_ROWS);

        store.set('tasks_count_3', '9000');
        expect(readRememberedTaskCount(3)).toBe(25);
    });

    it('does not store zero, and survives storage throwing', () => {
        stubStorage({
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            }
        });

        expect(() => rememberTaskCount(3, 0)).not.toThrow();
        expect(() => rememberTaskCount(3, 8)).not.toThrow();
        expect(readRememberedTaskCount(3)).toBe(DEFAULT_SKELETON_ROWS);
    });
});
