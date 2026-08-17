import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { getTasks } from '@/features/tasks/api/get-tasks';
import { getTimeEntries } from '@/features/time-entries/api/get-time-entries';
import { useProjects } from '@/features/projects/api/get-projects';
import { getHabitKpis } from '@/features/habits/api/get-habit-kpis';
import { getHabits } from '@/features/habits/api/get-habits';
import { habitKeys } from '@/features/habits/api/query-keys';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { calculateCompletionRate } from '@/features/trackers/utils/kpi-utils';
import { parseLocalDate, parseServerDate } from '@/lib/date-utils';
import { fetchAllPages } from '@/lib/paginate';
import { TaskStatus } from '@/types/types';
import type { TrackerLite } from '@/api';
import {
    buildBuckets,
    bucketBy,
    rankHabits,
    startOfDay,
    timeByProject,
    type Bucket,
    type ProjectTime,
    type RangeDays
} from '../utils/insights-utils';

/**
 * The list endpoints have no date-range filter, so this reads rows and buckets
 * them locally. Deliberately bounded at `MAX_ROWS`: if a profile has more, the
 * UI shows a "most recent 500" note rather than silently undercounting — the
 * one place that reads a partial list on purpose. `fetchAllPages` walks the
 * API's 100-row pages up to that bound.
 */
const MAX_ROWS = 500;
const CLOSED_STATUSES = new Set<number>([TaskStatus.DONE, TaskStatus.CANCELLED]);

/** Rows the habit chart renders; the rest of the profile's habits are ranked out. */
const HABIT_ROWS = 5;

export type HabitPerf = {
    id: number;
    name: string;
    color: string;
    /** Windowed completion rate, 0–100 (completed days only, from `kpi-utils`). */
    completionRate: number;
    /** Full-history current streak from the server KPI (0 unless it includes today). */
    currentStreak: number;
};

export type InsightsData = {
    isLoading: boolean;
    isError: boolean;
    hasAnyData: boolean;
    buckets: Bucket[];
    tasksCompletedSeries: number[];
    timeTrackedSeries: number[]; // seconds per bucket
    // Summary
    tasksCompleted: number;
    timeTrackedSeconds: number;
    habitCompletionRate: number; // aggregate %, 0–100
    habitsOnStreak: number;
    openCount: number;
    overdueCount: number;
    // Detail
    /** Top `HABIT_ROWS` habits by streak then completion, not the whole profile. */
    habitPerf: HabitPerf[];
    /** Active habits in the profile, so a ranked-out remainder can be labelled. */
    habitCount: number;
    projectTime: ProjectTime[];
    // Truncation flags (500-row cap hit)
    tasksTruncated: boolean;
    timeTruncated: boolean;
};

/**
 * Single derived view for the Insights page, keyed off the active profile and
 * the selected range. Composes the existing task/time/project/habit queries and
 * the tracker-KPI utilities — no backend changes. Habit stats fan out one
 * `getTrackersLite` and one `getHabitKpis` query per active habit via
 * `useQueries`: the trackers give the windowed completion rate, the KPI gives
 * the full-history streak.
 */
export const useInsightsData = (rangeDays: RangeDays): InsightsData => {
    const { activeProfileId, activeProfile } = useAuth();
    const profileId = activeProfileId ?? undefined;
    const weekStartMonday = activeProfile?.week_start_monday ?? true;

    const tasksQuery = useQuery({
        queryKey: ['insights-tasks', { profileId }],
        queryFn: async () => {
            // getTasks pages internally, so the cap is passed rather than
            // imposed by slicing here.
            const res = await getTasks({ profileId, includeClosed: true, maxRows: MAX_ROWS });
            return { items: res.tasks ?? [], total: res.total };
        },
        enabled: !!profileId,
        staleTime: 1000 * 60
    });
    const timeQuery = useQuery({
        queryKey: ['insights-time', { profileId }],
        queryFn: () =>
            fetchAllPages(
                async ({ offset, limit }) => {
                    const res = await getTimeEntries({ profileId, limit, offset });
                    return { items: res.time_entries ?? [], total: res.total };
                },
                { maxRows: MAX_ROWS }
            ),
        enabled: !!profileId,
        staleTime: 1000 * 60
    });
    const projectsQuery = useProjects({ profileId });

    const habitsQuery = useQuery({
        queryKey: habitKeys.list(activeProfileId),
        queryFn: () => {
            if (!activeProfileId) throw new Error('profileId is required');
            return getHabits(activeProfileId, 100);
        },
        enabled: !!activeProfileId,
        staleTime: 1000 * 60
    });

    // Active (non-archived) habits drive the per-habit tracker fan-out. Uses the
    // same ['trackers-lite', {habitId}, days] key shape as the dashboard so the
    // caches align and shared invalidations reach these too.
    const activeHabits = useMemo(
        () => (habitsQuery.data?.habits ?? []).filter((h) => !h.archived),
        [habitsQuery.data]
    );

    const trackerQueries = useQueries({
        queries: activeHabits.map((h) => ({
            queryKey: ['trackers-lite', { habitId: h.id }, rangeDays],
            queryFn: () => getTrackersLite(h.id, undefined, rangeDays),
            enabled: !!activeProfileId,
            staleTime: 1000 * 60
        }))
    });

    // Streaks come from the server KPI, not from the trackers above: that window
    // is `rangeDays` long, so computing a streak from it truncates any streak
    // longer than the range (a 40-day streak reads as 7 on the 7d toggle). Same
    // ['kpis', { habitId }] key as the dashboard and detail view (tz is not part
    // of it), so the cache and their optimistic patches are shared.
    const kpiQueries = useQueries({
        queries: activeHabits.map((h) => ({
            queryKey: ['kpis', { habitId: h.id }],
            queryFn: () => getHabitKpis(h.id),
            enabled: !!activeProfileId,
            staleTime: 1000 * 60
        }))
    });

    const trackersLoading = trackerQueries.some((q) => q.isLoading);
    const kpisLoading = kpiQueries.some((q) => q.isLoading);
    // Snapshot the per-habit tracker arrays into a stable primitive for the memo
    // dep (the query objects are new references every render).
    const trackerData = trackerQueries.map((q) => q.data?.trackers ?? []);
    const trackerKey = trackerData.map((t) => t.length).join(',');
    // A failed KPI degrades that habit's streak to 0 (and drops it down the
    // ranking) rather than erroring the whole page, matching the tracker fan-out.
    const streaks = kpiQueries.map((q) => q.data?.current_streak ?? 0);
    const streakKey = streaks.join(',');

    return useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);
        const buckets = buildBuckets(rangeDays, weekStartMonday, now);

        const tasks = tasksQuery.data?.items ?? [];
        const topLevel = tasks.filter((t) => t.parent_id == null);

        // Completed tasks per bucket (DONE, bucketed by closed_date).
        const tasksCompletedSeries = bucketBy(topLevel, buckets, (t) =>
            (t.status ?? -1) === TaskStatus.DONE && t.closed_date
                ? parseServerDate(t.closed_date)
                : null
        );
        const tasksCompleted = tasksCompletedSeries.reduce((a, b) => a + b, 0);

        // Point-in-time open / overdue among loaded top-level tasks.
        const openTasks = topLevel.filter((t) => !CLOSED_STATUSES.has(t.status ?? TaskStatus.OPEN));
        const openCount = openTasks.length;
        const overdueCount = openTasks.filter(
            (t) => t.due_date && parseLocalDate(t.due_date).getTime() < today.getTime()
        ).length;

        // Tracked time per bucket (seconds, bucketed by started_at).
        const entries = timeQuery.data?.items ?? [];
        const timeTrackedSeries = bucketBy(
            entries,
            buckets,
            (e) => (e.started_at ? parseServerDate(e.started_at) : null),
            (e) => e.duration_seconds ?? 0
        );
        const timeTrackedSeconds = timeTrackedSeries.reduce((a, b) => a + b, 0);

        // Time by project, windowed: only entries inside the bucket span count.
        // Attribution is the API's (resolved_project_id), so subtask time
        // reaches its parent's project - see timeByProject.
        const windowStart = buckets[0]?.start.getTime() ?? today.getTime();
        const windowEnd = buckets[buckets.length - 1]?.end.getTime() ?? today.getTime();
        const projectTime = timeByProject(
            entries,
            projectsQuery.data?.projects ?? [],
            windowStart,
            windowEnd
        );

        // Per-habit performance: windowed completion rate from the fanned-out
        // trackers, streak from the fanned-out KPIs.
        const allHabitPerf: HabitPerf[] = activeHabits.map((h, i) => {
            const trackers: TrackerLite[] = trackerData[i] ?? [];
            return {
                id: h.id,
                name: h.name,
                color: h.color,
                completionRate: Math.round(
                    calculateCompletionRate(
                        trackers,
                        h.frequency,
                        h.range,
                        h.created_date,
                        rangeDays
                    )
                ),
                currentStreak: streaks[i] ?? 0
            };
        });

        // The summary cards average and count over every active habit; only the
        // chart is capped.
        const habitCompletionRate =
            allHabitPerf.length > 0
                ? Math.round(
                      allHabitPerf.reduce((a, h) => a + h.completionRate, 0) / allHabitPerf.length
                  )
                : 0;
        const habitsOnStreak = allHabitPerf.filter((h) => h.currentStreak > 0).length;

        const habitPerf = rankHabits(allHabitPerf, HABIT_ROWS);

        const isLoading =
            tasksQuery.isLoading ||
            timeQuery.isLoading ||
            projectsQuery.isLoading ||
            habitsQuery.isLoading ||
            trackersLoading ||
            kpisLoading;
        const isError =
            tasksQuery.isError || timeQuery.isError || projectsQuery.isError || habitsQuery.isError;

        const hasAnyData =
            tasksCompleted > 0 ||
            timeTrackedSeconds > 0 ||
            allHabitPerf.length > 0 ||
            openCount > 0;

        return {
            isLoading,
            isError,
            hasAnyData,
            buckets,
            tasksCompletedSeries,
            timeTrackedSeries,
            tasksCompleted,
            timeTrackedSeconds,
            habitCompletionRate,
            habitsOnStreak,
            openCount,
            overdueCount,
            habitPerf,
            habitCount: allHabitPerf.length,
            projectTime,
            tasksTruncated: (tasksQuery.data?.total ?? 0) > tasks.length,
            timeTruncated: (timeQuery.data?.total ?? 0) > entries.length
        };
        // trackerKey and streakKey stand in for the per-habit query arrays (new
        // refs each render). habitsQuery.data is deliberately omitted:
        // activeHabits is its filtered, memoized derivative and already
        // re-triggers this memo when it changes.
    }, [
        rangeDays,
        weekStartMonday,
        tasksQuery.data,
        tasksQuery.isLoading,
        tasksQuery.isError,
        timeQuery.data,
        timeQuery.isLoading,
        timeQuery.isError,
        projectsQuery.data,
        projectsQuery.isLoading,
        projectsQuery.isError,
        habitsQuery.isLoading,
        habitsQuery.isError,
        activeHabits,
        trackersLoading,
        trackerKey,
        kpisLoading,
        streakKey
    ]);
};
