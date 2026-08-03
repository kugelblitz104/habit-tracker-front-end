/**
 * Readable detail URLs: `/tasks/setup-utilities` rather than `/tasks/172`.
 *
 * Tasks, projects and habits all carry a server-assigned `slug` (see the API's
 * `core/slugs.py`) and all three detail routes accept either form, so the
 * parsing rule lives here once instead of per feature.
 */

/** Numeric-only segment, i.e. the `/tasks/172` form. */
const NUMERIC_SEGMENT = /^\d+$/;

/**
 * The minimum needed to build a detail URL. Anything with an `id` works; a
 * `slug` is used when present.
 *
 * `slug` is optional even though the API's read models make it required,
 * because some call sites legitimately hold only an id: the search-state
 * hand-off passes a bare `openTaskId`, and a countdown carries only `task_id`.
 * Those get the numeric URL, which is permanently valid.
 */
export type SluggedEntity = { id: number; slug?: string | null };

/**
 * Path to an entity's detail screen, preferring the readable slug.
 *
 * Every row the API returns has a slug, since text that yields nothing on its
 * own falls back to "task" server-side rather than to null. The numeric branch
 * serves callers holding an id without the row, not slug-less rows.
 */
export const detailPath = (basePath: string, entity: SluggedEntity): string =>
    `${basePath}/${entity.slug ?? entity.id}`;

export const taskDetailPath = (task: SluggedEntity): string => detailPath('/tasks', task);
export const projectDetailPath = (project: SluggedEntity): string =>
    detailPath('/projects', project);
export const habitDetailPath = (habit: SluggedEntity): string => detailPath('/habits', habit);

export type EntityRef = { id: number } | { slug: string };

/**
 * Read a `/<base>/:ref` URL segment as either a numeric id or a slug.
 *
 * The two forms are distinguishable only because the backend guarantees no slug
 * is ever all digits (`core/slugs.slugify` prefixes those: "2841" becomes
 * "task-2841"), so an all-digits segment is unambiguously an id.
 *
 * The test is deliberately a strict all-digits match rather than `parseInt`:
 * slugs like "28-41" (from a title of "28 41") are legal, and
 * `parseInt('28-41')` returns 28, which would silently open a *different* row.
 * Returns null for an empty segment, so a route can render an error instead of
 * firing a request that cannot match.
 */
export const parseEntityRef = (segment: string | undefined): EntityRef | null => {
    if (!segment) return null;
    if (NUMERIC_SEGMENT.test(segment)) {
        const id = Number(segment);
        // A leading-zero or oversized segment still parses, but id 0 is not a
        // real row and would make `enabled: !!id` silently skip the query.
        return id > 0 ? { id } : null;
    }
    return { slug: segment };
};
