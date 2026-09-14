import type { JournalEntryRead } from '@/api';

/**
 * The reminder's decision logic, kept pure so it can be tested without a
 * clock, a browser or a query client.
 *
 * `journal_prompt_time` is a **wall-clock** time with no zone stored: 17:00
 * means 17:00 wherever you are, which is what you want when travelling. So
 * every comparison here is against the browser's local clock, never UTC.
 */

/** Minutes past local midnight for an `HH:MM[:SS]` time, or null if unusable. */
export const promptMinutes = (time: string | null | undefined): number | null => {
    if (!time) return null;
    const match = /^(\d{1,2}):(\d{2})/.exec(time);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
};

const minutesIntoDay = (now: Date): number => now.getHours() * 60 + now.getMinutes();

/** Whether the local clock has reached today's prompt time. */
export const isPastPromptTime = (time: string | null | undefined, now: Date): boolean => {
    const target = promptMinutes(time);
    return target !== null && minutesIntoDay(now) >= target;
};

/**
 * Milliseconds until today's prompt time, or null when it is unset, unusable
 * or already gone. Null means "do not arm a timer"; the catch-up path covers
 * the already-gone case.
 */
export const msUntilPromptTime = (time: string | null | undefined, now: Date): number | null => {
    const target = promptMinutes(time);
    if (target === null) return null;
    const at = new Date(now);
    at.setHours(Math.floor(target / 60), target % 60, 0, 0);
    const delay = at.getTime() - now.getTime();
    return delay > 0 ? delay : null;
};

export type CatchUpInput = {
    /** The profile's `journal_enabled`. */
    enabled: boolean;
    /** The profile's `journal_prompt_time`. */
    promptTime: string | null | undefined;
    now: Date;
    /** Today, `YYYY-MM-DD`, from the same local clock as `now`. */
    today: string;
    /** Today's entry: `null` for an unwritten day, `undefined` while unknown. */
    entry: JournalEntryRead | null | undefined;
    /** The last day this nudge was shown, so it fires once per day, not per page. */
    lastPromptedDate: string | null;
};

/**
 * Whether to surface the in-app catch-up nudge.
 *
 * The catch-up half is the one that matters: a notification at 17:00 is lost
 * if the laptop is shut, while "you have not checked in today" survives until
 * the app is next opened.
 *
 * A day counts as unchecked when it has no entry at all OR has one with no
 * `day_quality`: the check-in is the quality word, so prose alone still leaves
 * the day unchecked. An entry that has not loaded yet (`undefined`) never
 * fires, so a slow request cannot nag someone who did check in.
 */
export const shouldCatchUp = ({
    enabled,
    promptTime,
    now,
    today,
    entry,
    lastPromptedDate
}: CatchUpInput): boolean => {
    if (!enabled || entry === undefined) return false;
    if (lastPromptedDate === today) return false;
    if (!isPastPromptTime(promptTime, now)) return false;
    return !entry?.day_quality;
};
