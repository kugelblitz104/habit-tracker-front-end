/** Rows the skeleton paints when this profile has no remembered count yet. */
export const DEFAULT_SKELETON_ROWS = 5;

/** A stored value above this paints an absurdly tall skeleton, so cap it. */
const MAX_SKELETON_ROWS = 25;

// Follows the active_profile localStorage key naming (see auth-context.tsx).
const storageKey = (profileId: number) => `tasks_count_${profileId}`;

/**
 * How many open top-level tasks this profile had last time its list loaded.
 *
 * Wrapped because localStorage throws in a private window or with site data
 * blocked, and a skeleton is never worth an exception. Safe during render: the
 * app is SPA-only, so there is no server pass to disagree with.
 */
export const readRememberedTaskCount = (profileId: number | null | undefined): number => {
    if (!profileId) return DEFAULT_SKELETON_ROWS;
    try {
        const stored = Number(localStorage.getItem(storageKey(profileId)));
        if (!Number.isInteger(stored) || stored < 1) return DEFAULT_SKELETON_ROWS;
        return Math.min(stored, MAX_SKELETON_ROWS);
    } catch {
        return DEFAULT_SKELETON_ROWS;
    }
};

/** Remember this profile's open task count. Zero is not stored: the empty hint has no rows to size. */
export const rememberTaskCount = (profileId: number | null | undefined, count: number): void => {
    if (!profileId || !Number.isInteger(count) || count < 1) return;
    try {
        localStorage.setItem(storageKey(profileId), String(count));
    } catch {
        // Private window or quota. The skeleton falls back to its default.
    }
};
