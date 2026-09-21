import { dayDifference } from '@/lib/date-utils';

/**
 * When this profile last reconciled.
 *
 * Per-device, in localStorage, and deliberately so: it is cosmetic. It drives
 * the "Last reconciled N days ago" line and how often the Today card offers
 * itself, and nothing else. It is never a queue criterion - losing it costs a
 * line of text, not correctness. Queue membership lives in `updated_date`,
 * which is server-stamped and shared across devices.
 */

/** One key per profile, like the journal's reminder: each profile is its own list. */
const lastRunKey = (profileId: number) => `reconciliation:last-run:${profileId}`;

export const readLastRun = (profileId: number): string | null => {
    try {
        return window.localStorage.getItem(lastRunKey(profileId));
    } catch {
        // Private windows and blocked site data both throw here. Losing the
        // record only means the card can offer itself again.
        return null;
    }
};

export const writeLastRun = (profileId: number, day: string): void => {
    try {
        window.localStorage.setItem(lastRunKey(profileId), day);
    } catch {
        // See above.
    }
};

/** Whole days since the last run, or null if this profile has never reconciled. */
export const daysSinceLastRun = (lastRun: string | null, today: string): number | null =>
    lastRun === null ? null : dayDifference(today, lastRun);

/** How long the Today card waits before offering itself again. */
export const NUDGE_AFTER_DAYS = 30;

/**
 * Whether Today should offer the card. `hasWork` gates it absolutely: a card on
 * an empty queue set would be a chore with no content, however long it has been.
 */
export const shouldNudge = (lastRun: string | null, today: string, hasWork: boolean): boolean => {
    if (!hasWork) return false;
    const since = daysSinceLastRun(lastRun, today);
    return since === null || since >= NUDGE_AFTER_DAYS;
};
