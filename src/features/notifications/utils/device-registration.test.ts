import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    base64UrlToBytes,
    isProfileRegistered,
    markProfileRegistered,
    sameServerKey,
    unmarkProfileRegistered
} from './device-registration';

const memoryStorage = () => {
    const data = new Map<string, string>();
    return {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v)
    };
};

afterEach(() => vi.unstubAllGlobals());

describe('device registration', () => {
    it('tracks profiles independently', () => {
        vi.stubGlobal('localStorage', memoryStorage());
        markProfileRegistered(1);
        markProfileRegistered(2);
        markProfileRegistered(2);
        expect(isProfileRegistered(1)).toBe(true);
        expect(isProfileRegistered(3)).toBe(false);
        expect(unmarkProfileRegistered(1)).toBe(1);
        expect(isProfileRegistered(1)).toBe(false);
        expect(unmarkProfileRegistered(2)).toBe(0);
    });

    it('ignores corrupt stored data', () => {
        const storage = memoryStorage();
        storage.setItem('push_registered_profiles', '{oops');
        vi.stubGlobal('localStorage', storage);
        expect(isProfileRegistered(1)).toBe(false);
    });

    it('reads as not registered when storage throws', () => {
        const boom = () => {
            throw new Error('denied');
        };
        vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
        expect(isProfileRegistered(1)).toBe(false);
        expect(() => markProfileRegistered(1)).not.toThrow();
        expect(unmarkProfileRegistered(1)).toBe(0);
    });
});

describe('sameServerKey', () => {
    const key = new Uint8Array([1, 2, 3]);
    it('compares bytes', () => {
        expect(sameServerKey(new Uint8Array([1, 2, 3]).buffer, key)).toBe(true);
        expect(sameServerKey(new Uint8Array([1, 2, 4]).buffer, key)).toBe(false);
        expect(sameServerKey(new Uint8Array([1, 2]).buffer, key)).toBe(false);
        expect(sameServerKey(null, key)).toBe(false);
    });
});

describe('base64UrlToBytes', () => {
    it('decodes url-safe characters and missing padding', () => {
        // 0xfb 0xff 0xfe is "+//+" in base64 and "-__-" in base64url.
        expect(Array.from(base64UrlToBytes('-__-'))).toEqual([0xfb, 0xff, 0xfe]);
        expect(Array.from(base64UrlToBytes('aGk'))).toEqual([104, 105]);
    });
});
