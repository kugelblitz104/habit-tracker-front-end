import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys for the time-entries feature. Array style with an object second
 * element, matching the tasks/projects convention. `invalidateTimeEntries`
 * refreshes every surface that shows time for a profile after a mutation: the
 * lists (prefix match), the Today active-timer indicator, and the per-task
 * summary.
 */
export const timeEntryKeys = {
    list: (params: Record<string, unknown>) => ['time-entries', params] as const,
    active: (profileId: number | null | undefined) => ['time-entry-active', { profileId }] as const,
    summary: (profileId: number | null | undefined) =>
        ['time-entry-summary', { profileId }] as const
};

export const invalidateTimeEntries = (
    queryClient: QueryClient,
    profileId: number | null | undefined
) => {
    // Prefix match: invalidates every ['time-entries', {...}] list variant.
    queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    queryClient.invalidateQueries({ queryKey: timeEntryKeys.active(profileId) });
    queryClient.invalidateQueries({ queryKey: timeEntryKeys.summary(profileId) });
};
