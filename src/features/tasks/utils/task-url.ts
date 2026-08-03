import type { TaskRead } from '@/api';

/**
 * The minimum needed to build a task's detail URL. Anything with an `id` works;
 * a `slug` is used when present.
 *
 * `slug` is optional here even though `TaskRead.slug` is required, because some
 * call sites legitimately hold only an id — the search-state hand-off passes a
 * bare `openTaskId`, and a countdown carries only `task_id`. Those get the
 * numeric URL, which is permanently valid.
 */
export type TaskUrlRef = Pick<TaskRead, 'id'> & { slug?: string | null };

/** Numeric-only segment — i.e. the `/tasks/172` form. */
const NUMERIC_SEGMENT = /^\d+$/;

/**
 * Path to a task's detail screen, preferring the readable slug.
 *
 * Every task the API returns has a slug — a title that yields nothing on its own
 * falls back to "task" server-side rather than to null — so the numeric branch
 * here serves callers holding an id without the task, not slug-less tasks.
 */
export const taskDetailPath = (task: TaskUrlRef): string => `/tasks/${task.slug ?? task.id}`;

export type TaskRouteRef = { taskId: number } | { slug: string };

/**
 * Read a `/tasks/:taskRef` URL segment as either a numeric id or a slug.
 *
 * The two forms are distinguishable only because the backend guarantees no slug
 * is ever all digits (`core/slugs.slugify` prefixes those: "2841" becomes
 * "task-2841"), so an all-digits segment is unambiguously an id.
 *
 * The test is deliberately a strict all-digits match rather than `parseInt`:
 * slugs like "28-41" (from a title of "28 41") are legal, and
 * `parseInt('28-41')` returns 28 — which would silently open a *different*
 * task. Returns null for an empty segment, so the route can render an error
 * instead of firing a request that cannot match.
 */
export const parseTaskRef = (segment: string | undefined): TaskRouteRef | null => {
    if (!segment) return null;
    if (NUMERIC_SEGMENT.test(segment)) {
        const taskId = Number(segment);
        // A leading-zero or oversized segment still parses, but id 0 is not a
        // real task and would make `enabled: !!taskId` silently skip the query.
        return taskId > 0 ? { taskId } : null;
    }
    return { slug: segment };
};
