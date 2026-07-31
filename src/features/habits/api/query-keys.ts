import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys for the habits feature. `all` is the 1-element prefix that
 * matches every `['habits', {...}]` list variant (scoped by profile).
 */
export const habitKeys = {
    all: ['habits'] as const,
    list: (profileId: number | null | undefined) => ['habits', { profileId }] as const,
    detail: (habitId: number) => ['habit', { habitId }] as const
};

export const invalidateHabits = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: habitKeys.all });
