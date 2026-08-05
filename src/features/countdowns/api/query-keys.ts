import type { QueryClient } from '@tanstack/react-query';

/** Query keys for the countdowns feature (profile-scoped list). */
export const countdownKeys = {
    all: ['countdowns'] as const,
    list: (profileId: number | null | undefined) => ['countdowns', { profileId }] as const
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
