import { toLocalDateString } from '@/lib/date-utils';
import { useAuth } from '@/lib/auth-context';
import { useNow } from '@/lib/use-now';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { useJournalEntry } from '../api/get-journal-entry';
import { msUntilPromptTime, shouldCatchUp } from '../utils/journal-reminder';

/** One key per profile: "5pm for work, 10pm for personal" is two profiles. */
const lastPromptedKey = (profileId: number) => `journal:last-prompted:${profileId}`;

const readLastPrompted = (profileId: number): string | null => {
    try {
        return window.localStorage.getItem(lastPromptedKey(profileId));
    } catch {
        // Private windows and blocked site data both throw here. Losing the
        // record only means the nudge can repeat, so there is nothing to do.
        return null;
    }
};

const writeLastPrompted = (profileId: number, date: string) => {
    try {
        window.localStorage.setItem(lastPromptedKey(profileId), date);
    } catch {
        // See above.
    }
};

/** Toast plus a desktop notification when one is permitted, as the timer does. */
const notify = (body: string, onClick: () => void) => {
    toast.info(body, { onClick, toastId: 'journal-reminder' });
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            try {
                new Notification('Daily journal', { body });
            } catch {
                // Notification construction throws on some platforms; the
                // toast has already carried the message.
            }
        }
    }
};

const MESSAGE = 'You have not checked in today. Open the journal.';

/**
 * The journal reminder: foreground plus catch-up-on-open, no new
 * infrastructure (no service worker, no background push).
 *
 * - While a tab is open, a timer fires at `journal_prompt_time`.
 * - On open, if the local clock is already past that time and today has no
 *   quality word yet, the nudge is surfaced in-app straight away.
 *
 * The catch-up half is the one that matters: a notification at 17:00 is lost
 * if the laptop was shut, while "you have not checked in today" survives until
 * the app is next opened. It fires once per profile per day, recorded in
 * `localStorage`, so navigating between pages does not re-nag.
 *
 * Mounted once, in `AppHeader`, which is the only chrome on every signed-in
 * page. The whole hook is inert unless the profile has the journal on AND a
 * reminder time set.
 */
export const useJournalReminder = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const navigate = useNavigate();

    const promptTime = activeProfile?.journal_prompt_time ?? null;
    const enabled = activeProfile?.journal_enabled === true && promptTime !== null;

    // Minute ticks are what make the catch-up fire on a tab left open across
    // the prompt time, and what roll `today` over at midnight. This hook sits
    // in the header, so it ticks on every page: slow the clock right down when
    // there is no reminder to wait for rather than re-rendering the nav each
    // minute for profiles with no journal.
    const now = useNow(enabled ? 60_000 : 6 * 60 * 60_000);
    const today = toLocalDateString(now);

    const entryQuery = useJournalEntry({
        profileId: activeProfileId,
        date: today,
        queryConfig: { enabled: !!activeProfileId && enabled }
    });
    // `undefined` while the day is still unknown: never nag on a slow request.
    const entry = entryQuery.isSuccess ? (entryQuery.data ?? null) : undefined;

    const openJournal = () => {
        void navigate('/journal');
    };

    // Read by the timer callback, which must see the day as it is when it
    // fires rather than as it was when the timer was armed.
    const entryRef = useRef(entry);
    entryRef.current = entry;

    // The nudge already shown this mount, as `profileId:date`. localStorage
    // alone is not enough: writing it does not re-render, so the next tick
    // would read a stale value. Keyed by profile as well as day, or switching
    // profiles would inherit the other one's "already nudged".
    const promptedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!enabled || !activeProfileId) return;
        const shownThisMount = promptedRef.current === `${activeProfileId}:${today}`;
        const lastPromptedDate = shownThisMount ? today : readLastPrompted(activeProfileId);
        if (!shouldCatchUp({ enabled, promptTime, now, today, entry, lastPromptedDate })) return;

        promptedRef.current = `${activeProfileId}:${today}`;
        writeLastPrompted(activeProfileId, today);
        notify(MESSAGE, openJournal);
        // `openJournal` is left out of the deps on purpose: it is recreated
        // every render, and the guards above already make this idempotent.
    }, [enabled, activeProfileId, promptTime, now, today, entry]);

    useEffect(() => {
        if (!enabled) return;
        // Deliberately not keyed on `now`: the delay is computed once per day
        // rather than re-armed on every minute tick.
        const delay = msUntilPromptTime(promptTime, new Date());
        if (delay === null) return;

        const timer = window.setTimeout(() => {
            if (entryRef.current?.day_quality) return;
            notify(MESSAGE, openJournal);
        }, delay);
        return () => window.clearTimeout(timer);
    }, [enabled, promptTime, today]);
};
