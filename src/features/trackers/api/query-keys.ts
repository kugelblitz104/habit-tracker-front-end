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
 * Prefixes of the two profile-wide habit batch keys.
 *
 * Owned here rather than in `use-habit-batch-data`, which builds the full keys
 * from them: that module imports `trackerKeys`, so importing its
 * `habitBatchKeys` back would be a cycle, and `invalidateHabitTrackers` below
 * has to reach the trackers batch.
 */
export const habitsTrackersBatchKey = ['habits-trackers-lite'] as const;
export const habitsKpisBatchKey = ['habits-kpis'] as const;

/**
 * Invalidate every cache derived from a habit's trackers after a create/update:
 * the full-history and lite tracker lists (Today panel, dashboard grid, detail
 * calendar) plus the server-computed KPI/streak caches, so no consumer of this
 * habit's data is left stale. Invalidation order has no semantic effect.
 *
 * The dashboard grid reads the profile-wide trackers batch, not the per-habit
 * lite list, so a write from the Today panel or the detail pane leaves the grid
 * stale unless that batch is invalidated too. It is inactive on narrow screens,
 * where this only marks it stale.
 *
 * The KPI batch is deliberately NOT invalidated: refetching it reruns a
 * whole-profile full-history scan on every click. Callers that need the streak
 * column exact run `reconcileHabitKpis` for the one habit that changed.
 */
export const invalidateHabitTrackers = (queryClient: QueryClient, habitId: number) => {
    queryClient.invalidateQueries({ queryKey: trackerKeys.trackers(habitId) });
    queryClient.invalidateQueries({ queryKey: trackerKeys.lite(habitId) });
    queryClient.invalidateQueries({ queryKey: trackerKeys.kpis(habitId) });
    queryClient.invalidateQueries({ queryKey: trackerKeys.streaks(habitId) });
    queryClient.invalidateQueries({ queryKey: habitsTrackersBatchKey });
};
