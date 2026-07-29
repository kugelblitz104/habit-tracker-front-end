import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys for a habit's trackers and the server-computed KPI/streak
 * caches derived from them. `lite` must stay a 2-element tuple — TanStack
 * matches keys by prefix, and `['trackers-lite', {habitId}]` is a prefix of
 * the day-windowed `['trackers-lite', {habitId}, days]` variant some callers
 * fetch, so widening it here would silently stop matching those.
 */
export const trackerKeys = {
    trackers: (habitId: number) => ['trackers', { habitId }] as const,
    lite: (habitId: number) => ['trackers-lite', { habitId }] as const,
    kpis: (habitId: number) => ['kpis', { habitId }] as const,
    streaks: (habitId: number) => ['streaks', { habitId }] as const
};

/**
 * Invalidate every cache derived from a habit's trackers after a create/update:
 * the full-history and lite tracker lists (Today panel, dashboard grid, detail
 * calendar) plus the server-computed KPI/streak caches, so no consumer of this
 * habit's data is left stale. Invalidation order has no semantic effect.
 */
export const invalidateHabitTrackers = (queryClient: QueryClient, habitId: number) => {
    queryClient.invalidateQueries({ queryKey: trackerKeys.trackers(habitId) });
    queryClient.invalidateQueries({ queryKey: trackerKeys.lite(habitId) });
    queryClient.invalidateQueries({ queryKey: trackerKeys.kpis(habitId) });
    queryClient.invalidateQueries({ queryKey: trackerKeys.streaks(habitId) });
};
