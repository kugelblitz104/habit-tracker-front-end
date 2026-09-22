import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { getTasks } from '@/features/tasks/api/get-tasks';
import { getTimeEntries } from '@/features/time-entries/api/get-time-entries';
import { useProjects } from '@/features/projects/api/get-projects';
import { getHabits } from '@/features/habits/api/get-habits';
import { habitKeys } from '@/features/habits/api/query-keys';
import {
    useHabitTrackersBatch,
    useHabitKpisBatch
} from '@/features/habits/hooks/use-habit-batch-data';
import { calculateCompletionRate } from '@/features/trackers/utils/kpi-utils';
import { parseLocalDate, parseServerDate } from '@/lib/date-utils';
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
 * one place that reads a partial list on purpose. `getTasks`/`getTimeEntries`
 * page internally, so the cap is passed rather than imposed by slicing here.
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
 * the tracker-KPI utilities, no backend changes. Habit stats come from the
 * two profile-wide batch queries, `useHabitTrackersBatch` and
 * `useHabitKpisBatch`: the trackers give the windowed completion rate, the
 * KPI gives the full-history streak.
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
        queryFn: () => getTimeEntries({ profileId, maxRows: MAX_ROWS }),
        enabled: !!profileId,
        staleTime: 1000 * 60
    });
    const projectsQuery = useProjects({ profileId });

    const habitsQuery = useQuery({
        queryKey: habitKeys.list(activeProfileId),
        queryFn: () => {
            if (!activeProfileId) throw new Error('profileId is required');
            return getHabits(activeProfileId);
        },
        enabled: !!activeProfileId,
        staleTime: 1000 * 60
    });

    // The batch reads below filter server-side via `archived: false`.
    // `activeHabits` applies the same non-archived filter client-side,
    // independently, to drive the per-habit ranking below - the two filters
    // agree today, but neither is derived from the other.
    const activeHabits = useMemo(
        () => (habitsQuery.data?.habits ?? []).filter((h) => !h.archived),
        [habitsQuery.data]
    );

    const trackersBatch = useHabitTrackersBatch({
        profileId: activeProfileId,
        days: rangeDays,
        archived: false
    });
    const kpisBatch = useHabitKpisBatch({ profileId: activeProfileId, archived: false });

    const trackersLoading = trackersBatch.isLoading;
    const kpisLoading = kpisBatch.isLoading;

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
        const entries = timeQuery.data?.time_entries ?? [];
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

        // Per-habit performance: windowed completion rate from the batched
        // trackers, streak from the batched KPIs.
        const allHabitPerf: HabitPerf[] = activeHabits.map((h) => {
            const trackers: TrackerLite[] = trackersBatch.byHabit.get(h.id)?.trackers ?? [];
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
                // Streak comes from the server KPI, not from the windowed
                // `trackers` above: that window is rangeDays long, so a streak
                // computed from it truncates anything longer than the window -
                // a 40-day streak would read as 7 on the 7d toggle. The KPI's
                // current_streak is full-history, so rangeDays can't truncate it.
                // `?? 0` covers a habit absent from the batch rather than
                // a single failed request: one batch succeeds or fails for
                // every habit at once, the same all-or-nothing the tasks,
                // time and projects queries on this page already have.
                currentStreak: kpisBatch.byHabit.get(h.id)?.current_streak ?? 0
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
        // habitsQuery.data is deliberately omitted: activeHabits is its
        // filtered, memoized derivative and already re-triggers this memo
        // when it changes.
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
        trackersBatch.byHabit,
        kpisLoading,
        kpisBatch.byHabit
    ]);
};
