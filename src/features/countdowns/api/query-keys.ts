import type { QueryClient } from '@tanstack/react-query';

/** Query keys for the countdowns feature (profile-scoped list). */
export const countdownKeys = {
    all: ['countdowns'] as const,
    // The live and archived lists are separate server-side filters, so they are
    // separate cache entries; `all` still invalidates both, which archiving needs.
    list: (profileId: number | null | undefined, archived = false) =>
        ['countdowns', { profileId, archived }] as const
};

export const invalidateCountdowns = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: countdownKeys.all });

/** Query keys for the countdown categories (profile-scoped list). */
export const countdownCategoryKeys = {
    all: ['countdown-categories'] as const,
    list: (profileId: number | null | undefined) => ['countdown-categories', { profileId }] as const
};

export const invalidateCountdownCategories = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: countdownCategoryKeys.all });
