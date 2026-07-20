import type { ProjectRead, TaskRead, TimeEntrySummary } from '@/api';
import { STATUS_ORDER } from '@/features/tasks/components/status-config';
import { parseServerDate } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';

/**
 * Client-side project analytics — everything derives from data the project page
 * already has on hand: the authoritative open/done counts on the project, the
 * loaded task list (status / priority / completion dates), and the profile-wide
 * time summary filtered to this project. No backend aggregation endpoint needed.
 */

export type StatusMixEntry = { status: number; count: number };
export type PriorityMixEntry = { priority: number; count: number };
export type TaskTimeEntry = { taskId: number; title: string; seconds: number };
export type ThroughputWeek = { key: string; label: string; count: number };

export type ProjectAnalyticsData = {
    /** open + done, from the project's authoritative counts (not the page cap). */
    total: number;
    open: number;
    done: number;
    donePct: number;
    /** Non-zero statuses in canonical order. */
    statusMix: StatusMixEntry[];
    /** Non-zero priorities, high → none. */
    priorityMix: PriorityMixEntry[];
    /** Total tracked seconds for the project (incl. adhoc project-attached). */
    totalSeconds: number;
    entryCount: number;
    /** Tasks with the most tracked time, highest first (top 5). */
    topTasksByTime: TaskTimeEntry[];
    /** Tasks completed per week, oldest → newest. */
    throughput: ThroughputWeek[];
    /** Whether any (top-level) task data was loaded — gates the empty state. */
    hasTaskData: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Monday-anchored start of the week containing `d`, at local midnight. */
const startOfWeek = (d: Date): Date => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = (x.getDay() + 6) % 7; // Monday = 0
    x.setDate(x.getDate() - dow);
    return x;
};

const weekLabel = (d: Date): string => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * DONE tasks completed per week over the last `weeks` weeks (Monday-anchored),
 * oldest → newest. Uses local-date arithmetic (not fixed ms) so week boundaries
 * stay put across DST.
 */
const buildThroughput = (tasks: TaskRead[], now: Date, weeks: number): ThroughputWeek[] => {
    const current = startOfWeek(now);
    const buckets: ThroughputWeek[] = [];
    const indexByKey = new Map<string, number>();
    for (let i = weeks - 1; i >= 0; i--) {
        const ws = new Date(current.getFullYear(), current.getMonth(), current.getDate() - i * 7);
        const key = isoDate(ws);
        indexByKey.set(key, buckets.length);
        buckets.push({ key, label: weekLabel(ws), count: 0 });
    }
    for (const t of tasks) {
        if ((t.status ?? -1) !== TaskStatus.DONE || !t.closed_date) continue;
        const idx = indexByKey.get(isoDate(startOfWeek(parseServerDate(t.closed_date))));
        if (idx != null) buckets[idx]!.count += 1;
    }
    return buckets;
};

export const computeProjectAnalytics = (
    tasks: TaskRead[],
    summary: TimeEntrySummary | undefined,
    project: ProjectRead,
    now: Date
): ProjectAnalyticsData => {
    const open = project.open_count ?? 0;
    const done = project.done_count ?? 0;
    const total = open + done;
    const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

    // Top-level tasks drive status/priority mix + throughput (matches the task
    // list); subtasks are folded into their parent's work.
    const topLevel = tasks.filter((t) => t.parent_id == null);

    const statusCounts = new Map<number, number>();
    const priorityCounts = new Map<number, number>();
    for (const t of topLevel) {
        const s = t.status ?? TaskStatus.OPEN;
        statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
        const p = t.priority ?? 0;
        priorityCounts.set(p, (priorityCounts.get(p) ?? 0) + 1);
    }
    const statusMix: StatusMixEntry[] = STATUS_ORDER.filter(
        (s) => (statusCounts.get(s) ?? 0) > 0
    ).map((s) => ({ status: s, count: statusCounts.get(s)! }));
    const priorityMix: PriorityMixEntry[] = [3, 2, 1, 0]
        .filter((p) => (priorityCounts.get(p) ?? 0) > 0)
        .map((p) => ({ priority: p, count: priorityCounts.get(p)! }));

    // Time: the per-project bucket already resolves task-attached + adhoc entries
    // for us; the per-task breakdown is scoped to tasks in the loaded set (which
    // is this project's tasks).
    const projectBucket = (summary?.per_project ?? []).find((b) => b.project_id === project.id);
    const totalSeconds = projectBucket?.total_seconds ?? 0;
    const entryCount = projectBucket?.entry_count ?? 0;

    const titleById = new Map<number, string>();
    for (const t of tasks) titleById.set(t.id, t.title);
    const topTasksByTime: TaskTimeEntry[] = (summary?.per_task ?? [])
        .filter((b) => b.task_id != null && titleById.has(b.task_id))
        .map((b) => ({ taskId: b.task_id!, title: titleById.get(b.task_id!)!, seconds: b.total_seconds }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 5);

    return {
        total,
        open,
        done,
        donePct,
        statusMix,
        priorityMix,
        totalSeconds,
        entryCount,
        topTasksByTime,
        throughput: buildThroughput(topLevel, now, 8),
        hasTaskData: topLevel.length > 0
    };
};
