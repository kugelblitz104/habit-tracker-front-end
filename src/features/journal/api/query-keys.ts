import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys for the journal feature. `day` and `list` are separate top-level
 * tuples (the time-entries convention: `list` / `active` / `summary` each
 * invalidate on their own), so a single-day fetch and a range fetch cache
 * independently, but a write to one day invalidates both.
 *
 * `day` MUST carry both `profileId` and `date`: a session left open across
 * midnight, or a profile switch, must never keep serving a stale day's cached
 * entry (`get-trackers.ts` has a live bug of exactly this shape, missing the
 * resolved day from its key).
 */
export const journalKeys = {
    day: (profileId: number | null | undefined, date: string) =>
        ['journal-day', { profileId, date }] as const,
    list: (
        profileId: number | null | undefined,
        fromDate?: string | null,
        toDate?: string | null
    ) => ['journal-list', { profileId, fromDate, toDate }] as const
};

export const invalidateJournal = (queryClient: QueryClient) => {
    // Prefix match: invalidates every ['journal-day', {...}] entry.
    queryClient.invalidateQueries({ queryKey: ['journal-day'] });
    // Prefix match: invalidates every ['journal-list', {...}] range variant.
    queryClient.invalidateQueries({ queryKey: ['journal-list'] });
};
