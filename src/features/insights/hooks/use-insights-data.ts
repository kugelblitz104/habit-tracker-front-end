import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { getTasks } from '@/features/tasks/api/get-tasks';
import { getTimeEntries } from '@/features/time-entries/api/get-time-entries';
import { useProjects } from '@/features/projects/api/get-projects';
import { getHabits } from '@/features/habits/api/get-habits';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import {
    calculateCompletionRate,
    calculateStreaks,
    getCurrentStreakLength
} from '@/features/trackers/utils/kpi-utils';
import { parseLocalDate, parseServerDate } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';
import type { TrackerLite } from '@/api';
import { buildBuckets, bucketBy, startOfDay, type Bucket, type RangeDays } from '../utils/insights-utils';

/**
 * The list endpoints have no date-range filter and cap `limit` at 100 per
 * request, so we page through in `PAGE_SIZE` chunks up to `MAX_ROWS` and bucket
 * locally. If a profile has more than the cap, the UI shows a "most recent 500"
 * note rather than silently undercounting.
 */
const PAGE_SIZE = 100;
const MAX_ROWS = 500;
const CLOSED_STATUSES = new Set<number>([TaskStatus.DONE, TaskStatus.CANCELLED]);

type Paged<T> = { items: T[]; total: number };

/** Page a list endpoint (100/request) until we hit its total or `MAX_ROWS`. */
const fetchPaged = async <T>(
    fetchPage: (limit: number, offset: number) => Promise<{ rows: T[]; total: number }>
): Promise<Paged<T>> => {
    const first = await fetchPage(PAGE_SIZE, 0);
    const items = [...first.rows];
    const total = first.total ?? items.length;
    let offset = PAGE_SIZE;
    while (items.length < Math.min(total, MAX_ROWS)) {
        const page = await fetchPage(PAGE_SIZE, offset);
        if (page.rows.length === 0) break;
        items.push(...page.rows);
        offset += PAGE_SIZE;
    }
    return { items, total };
};

export type HabitPerf = {
    id: number;
    name: string;
    color: string;
    /** Windowed completion rate, 0–100 (auto-skip aware, from `kpi-utils`). */
    completionRate: number;
    /** Current streak length (streaks are inherently not windowed). */
    currentStreak: number;
};

export type ProjectTime = {
    projectId: number | null;
    name: string;
    color: string;
    seconds: number;
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
    habitPerf: HabitPerf[];
    projectTime: ProjectTime[];
    // Truncation flags (500-row cap hit)
    tasksTruncated: boolean;
    timeTruncated: boolean;
};

/**
 * Single derived view for the Insights page, keyed off the active profile and
 * the selected range. Composes the existing task/time/project/habit queries and
 * the tracker-KPI utilities — no backend changes. Habit stats fan out one
 * `getTrackersLite` query per active habit via `useQueries`.
 */
export const useInsightsData = (rangeDays: RangeDays): InsightsData => {
    const { user, activeProfileId, activeProfile } = useAuth();
    const profileId = activeProfileId ?? undefined;
    const userId = user?.id ?? 0;
    const weekStartMonday = activeProfile?.week_start_monday ?? true;

    const tasksQuery = useQuery({
        queryKey: ['insights-tasks', { profileId }],
        queryFn: () =>
            fetchPaged(async (limit, offset) => {
                const res = await getTasks({ profileId, includeClosed: true, limit, offset });
                return { rows: res.tasks ?? [], total: res.total };
            }),
        enabled: !!profileId,
        staleTime: 1000 * 60
    });
    const timeQuery = useQuery({
        queryKey: ['insights-time', { profileId }],
        queryFn: () =>
            fetchPaged(async (limit, offset) => {
                const res = await getTimeEntries({ profileId, limit, offset });
                return { rows: res.time_entries ?? [], total: res.total };
            }),
        enabled: !!profileId,
        staleTime: 1000 * 60
    });
    const projectsQuery = useProjects({ profileId });

    const habitsQuery = useQuery({
        queryKey: ['habits', { userId, profileId: activeProfileId }],
        queryFn: () => getHabits(userId, 100, activeProfileId),
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

    const trackersLoading = trackerQueries.some((q) => q.isLoading);
    // Snapshot the per-habit tracker arrays into a stable primitive for the memo
    // dep (the query objects are new references every render).
    const trackerData = trackerQueries.map((q) => q.data?.trackers ?? []);
    const trackerKey = trackerData.map((t) => t.length).join(',');

    return useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);
        const buckets = buildBuckets(rangeDays, weekStartMonday, now);

        const tasks = tasksQuery.data?.items ?? [];
        const topLevel = tasks.filter((t) => t.parent_id == null);

        // Completed tasks per bucket (DONE, bucketed by closed_date).
        const tasksCompletedSeries = bucketBy(
            topLevel,
            buckets,
            (t) =>
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
        const windowStart = buckets[0]?.start.getTime() ?? today.getTime();
        const windowEnd = buckets[buckets.length - 1]?.end.getTime() ?? today.getTime();
        const projects = projectsQuery.data?.projects ?? [];
        const projectById = new Map(projects.map((p) => [p.id, p]));
        const secondsByProject = new Map<number | null, number>();
        for (const e of entries) {
            if (!e.started_at) continue;
            const t = parseServerDate(e.started_at).getTime();
            if (t < windowStart || t >= windowEnd) continue;
            const key = e.project_id ?? null;
            secondsByProject.set(key, (secondsByProject.get(key) ?? 0) + (e.duration_seconds ?? 0));
        }
        const projectTime: ProjectTime[] = [...secondsByProject.entries()]
            .filter(([, seconds]) => seconds > 0)
            .map(([pid, seconds]) => {
                const p = pid != null ? projectById.get(pid) : undefined;
                return {
                    projectId: pid,
                    name: p?.name ?? 'No project',
                    color: p?.color ?? 'var(--color-text-muted)',
                    seconds
                };
            })
            .sort((a, b) => b.seconds - a.seconds);

        // Per-habit performance from the fanned-out trackers.
        const habitPerf: HabitPerf[] = activeHabits.map((h, i) => {
            const trackers: TrackerLite[] = trackerData[i] ?? [];
            const streaks = calculateStreaks(trackers, h.frequency, h.range, h.created_date);
            return {
                id: h.id,
                name: h.name,
                color: h.color,
                completionRate: Math.round(
                    calculateCompletionRate(trackers, h.frequency, h.range, h.created_date, rangeDays)
                ),
                currentStreak: getCurrentStreakLength(streaks)
            };
        });
        habitPerf.sort((a, b) => b.completionRate - a.completionRate);

        const habitCompletionRate =
            habitPerf.length > 0
                ? Math.round(habitPerf.reduce((a, h) => a + h.completionRate, 0) / habitPerf.length)
                : 0;
        const habitsOnStreak = habitPerf.filter((h) => h.currentStreak > 0).length;

        const isLoading =
            tasksQuery.isLoading ||
            timeQuery.isLoading ||
            projectsQuery.isLoading ||
            habitsQuery.isLoading ||
            trackersLoading;
        const isError =
            tasksQuery.isError || timeQuery.isError || projectsQuery.isError || habitsQuery.isError;

        const hasAnyData =
            tasksCompleted > 0 ||
            timeTrackedSeconds > 0 ||
            habitPerf.length > 0 ||
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
            projectTime,
            tasksTruncated: (tasksQuery.data?.total ?? 0) > tasks.length,
            timeTruncated: (timeQuery.data?.total ?? 0) > entries.length
        };
        // trackerKey stands in for the tracker arrays (new refs each render).
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        trackerKey
    ]);
};
