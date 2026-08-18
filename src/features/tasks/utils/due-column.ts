import type { CSSProperties } from 'react';

import { getCountdown } from '@/features/countdowns/utils/countdown';

/**
 * The task row's fixed-width due column. A thin wrapper over `getCountdown`,
 * which is shared with the Countdown entity surfaces and must not change.
 *
 * Two deliberate differences from `getCountdown().label`: this says "late"
 * rather than "overdue" so three digits fit the 66px column, and it capitalizes
 * for a column rather than a sentence. The detail panel keeps "overdue", which
 * is the only permitted variance in wording between the two views.
 */

export type DueColumn = {
    text: string;
    style: CSSProperties;
};

/**
 * Only the three states a person can still act on today carry a filled chip.
 * Anything further out is plain text, so a fill down the column always means
 * "decide about this now" rather than "this has a date".
 */
const OVERDUE: CSSProperties = {
    color: 'var(--color-danger)',
    backgroundColor: 'var(--due-late-bg)',
    fontWeight: 600
};
const IMMINENT: CSSProperties = {
    color: 'var(--color-now-accent)',
    backgroundColor: 'var(--due-now-bg)',
    fontWeight: 600
};
const TOMORROW: CSSProperties = {
    color: 'var(--color-now-accent)',
    backgroundColor: 'var(--due-now-bg)',
    fontWeight: 500
};
const LATER: CSSProperties = { color: 'var(--color-text-secondary)', fontWeight: 400 };

export const formatDueColumn = (
    dueDate: string | null | undefined,
    dueTime: string | null | undefined,
    now: Date = new Date()
): DueColumn | null => {
    const countdown = getCountdown(dueDate, dueTime, now);
    if (!countdown) return null;

    const { overdue, daysUntil, label } = countdown;

    if (overdue) {
        return {
            text: daysUntil === 0 ? 'Late' : `${Math.abs(daysUntil)}d late`,
            style: OVERDUE
        };
    }
    if (daysUntil === 0) {
        // A timed task keeps its live "5h 30m"; that precision is the reason a
        // due time was set.
        return { text: dueTime ? label : 'Today', style: IMMINENT };
    }
    if (daysUntil === 1) return { text: 'Tomorrow', style: TOMORROW };
    return { text: `${daysUntil}d`, style: LATER };
};
