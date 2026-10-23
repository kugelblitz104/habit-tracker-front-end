const KEY = 'push_registered_profiles';

/** Profile ids registered for push from this browser. Empty when storage is unavailable. */
const read = (): number[] => {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.filter((id): id is number => typeof id === 'number')
            : [];
    } catch {
        return [];
    }
};

const write = (ids: number[]) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
        // Storage unavailable: the profile reads as not registered.
    }
};

export const isProfileRegistered = (profileId: number): boolean => read().includes(profileId);

export const markProfileRegistered = (profileId: number) => {
    const ids = read();
    if (!ids.includes(profileId)) write([...ids, profileId]);
};

/** Removes the profile and returns how many profiles remain registered. */
export const unmarkProfileRegistered = (profileId: number): number => {
    const rest = read().filter((id) => id !== profileId);
    write(rest);
    return rest.length;
};

/** True when a subscription's applicationServerKey is byte-identical to `key`. */
export const sameServerKey = (
    existing: ArrayBuffer | null | undefined,
    key: Uint8Array
): boolean => {
    if (!existing) return false;
    const bytes = new Uint8Array(existing);
    return bytes.length === key.length && bytes.every((b, i) => b === key[i]);
};

/** Decodes a base64url string (the VAPID key, subscription keys) to bytes. */
export const base64UrlToBytes = (value: string): Uint8Array<ArrayBuffer> => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};
