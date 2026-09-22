import type { HabitKPIs, HabitKPIsEntry, HabitTrackersLite, TrackerLite } from '@/api';
import {
    habitsKpisBatchKey,
    habitsTrackersBatchKey,
    trackerKeys
} from '@/features/trackers/api/query-keys';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Apply one optimistic tracker transform to the profile-wide trackers batch,
 * so the clicked day cell repaints before the write lands.
 *
 * KPI figures are deliberately NOT patched here. The only tracker list this
 * surface holds is the RENDERED WINDOW (4 to 14 days), and every KPI is a
 * full-history quantity, so anything derived from the window is wrong rather
 * than merely approximate. The case that makes it obvious: completing the one
 * missing day between an 8-day and a 9-day run joins them into 18, but a
 * 14-day window can only ever report 14, so the streak column would read
 * 8 -> 14 -> 18 and the 14 looks like a bug. Leaving the previous figure in
 * place gives 8 -> 18 instead, once `reconcileHabitKpis` returns with the
 * server's answer.
 *
 * Not patching also keeps this write out of other surfaces' caches: the
 * dashboard and Insights hold separate KPI batch entries, and `setQueriesData`
 * would have written a window-derived figure into both.
 */
export const patchHabitTrackersBatch = (
    queryClient: QueryClient,
    habitId: number,
    update: (trackers: TrackerLite[]) => TrackerLite[]
): void => {
    queryClient.setQueriesData<HabitTrackersLite[]>({ queryKey: habitsTrackersBatchKey }, (old) =>
        old?.map((entry) =>
            entry.habit_id === habitId
                ? { ...entry, trackers: update(entry.trackers ?? []) }
                : entry
        )
    );
};

/**
 * Ticket of the newest reconcile started for each habit. Clicking a cell twice
 * starts two reads of the same endpoint, and the second one's answer is the
 * one that describes the current state, so a slow first response has to be
 * dropped rather than written over it.
 */
const latestReconcile = new Map<number, number>();

/**
 * Overwrite one habit's KPI figures with the server's, in the per-habit cache
 * and in every cached profile-wide batch entry.
 *
 * This is what moves the dashboard's streak column after a write, since
 * `patchHabitTrackersBatch` deliberately leaves KPI figures alone. Until it
 * returns, the column shows the pre-write figure: stale for one round trip,
 * rather than a window-derived number that would be wrong.
 *
 * Costs one request per call, so it is skipped when no cached batch holds the
 * habit. A surface that never loaded the batch reads its KPIs per habit and
 * has already invalidated them. A failed read leaves the caches as they were,
 * to be corrected by the next natural refetch.
 */
export const reconcileHabitKpis = async (
    queryClient: QueryClient,
    habitId: number,
    fetchKpis: (habitId: number) => Promise<HabitKPIs>
): Promise<void> => {
    const batches = queryClient.getQueriesData<HabitKPIsEntry[]>({ queryKey: habitsKpisBatchKey });
    if (!batches.some(([, entries]) => entries?.some((e) => e.habit_id === habitId))) return;

    const ticket = (latestReconcile.get(habitId) ?? 0) + 1;
    latestReconcile.set(habitId, ticket);

    const kpis = await fetchKpis(habitId).catch((error: unknown) => {
        console.error('Error reconciling habit KPIs:', error);
        return null;
    });
    if (!kpis || latestReconcile.get(habitId) !== ticket) return;

    queryClient.setQueryData<HabitKPIs>(trackerKeys.kpis(habitId), kpis);
    queryClient.setQueriesData<HabitKPIsEntry[]>({ queryKey: habitsKpisBatchKey }, (old) =>
        old?.map((entry) => (entry.habit_id === habitId ? { ...entry, kpis } : entry))
    );
};
