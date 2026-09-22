/** Rows the skeleton paints when this profile has no remembered count yet. */
export const DEFAULT_SKELETON_ROWS = 5;

/** A stored value above this paints an absurdly tall skeleton, so cap it. */
const MAX_SKELETON_ROWS = 25;

// Follows the active_profile localStorage key naming (see auth-context.tsx).
const storageKey = (profileId: number) => `habits_count_${profileId}`;

/**
 * How many habits this profile had last time its dashboard loaded.
 *
 * The count barely changes between visits, so it is a better skeleton row
 * count than a fixed guess: the placeholder table comes out the height the
 * real one will be, and nothing shifts when the rows arrive.
 *
 * Reads are wrapped because localStorage throws rather than returning null in
 * a private window or with site data blocked, and a skeleton is never worth an
 * exception. Safe to call during render: this app is SPA-only
 * (`react-router.config.ts` sets `ssr: false`) and the dashboard is not
 * prerendered, so there is no server pass to disagree with.
 */
export const readRememberedHabitCount = (profileId: number | null | undefined): number => {
    if (!profileId) return DEFAULT_SKELETON_ROWS;
    try {
        const stored = Number(localStorage.getItem(storageKey(profileId)));
        if (!Number.isInteger(stored) || stored < 1) return DEFAULT_SKELETON_ROWS;
        return Math.min(stored, MAX_SKELETON_ROWS);
    } catch {
        return DEFAULT_SKELETON_ROWS;
    }
};

/**
 * Remember this profile's habit count for the next load.
 *
 * A count of zero is not stored: the empty state replaces the table entirely,
 * so there is no skeleton for it to size, and storing it would only make the
 * next real load paint a zero-row placeholder.
 */
export const rememberHabitCount = (profileId: number | null | undefined, count: number): void => {
    if (!profileId || !Number.isInteger(count) || count < 1) return;
    try {
        localStorage.setItem(storageKey(profileId), String(count));
    } catch {
        // Private window or quota. The skeleton falls back to its default.
    }
};
