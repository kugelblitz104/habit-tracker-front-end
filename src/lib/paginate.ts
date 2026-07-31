/**
 * Offset paging for the API's list endpoints.
 *
 * Every list endpoint on the backend caps `limit` at 100 (`ge=1, le=100`) and
 * returns the matching row count as `total`. Nothing in the UI paged: the task
 * list, project view, search and subtask panes each fetched once and filtered
 * the result client-side, so past 100 rows they silently dropped whatever fell
 * off the end — a task's subtasks first, since subtasks sort to the tail
 * (priority 0, no due date). This walks the pages so callers get the whole set.
 *
 * Callers that deliberately bound the walk (the Insights dashboard reads at
 * most 500 rows and shows a "most recent 500" note) pass `maxRows` and compare
 * `total` against the rows they got back to detect the cap.
 */

/** The `limit` every list endpoint caps at — always ask for a full page. */
export const PAGE_SIZE = 100;

/**
 * Hard bound on pages fetched, so a `total` that never converges (rows being
 * added between requests) can't spin forever. 50 pages = 5000 rows; a profile
 * that large has bigger problems than this loop, and hitting the bound warns
 * rather than truncating in silence.
 */
const MAX_PAGES = 50;

type Page<T> = {
    items: T[];
    total: number;
};

/** Which slice to fetch. An object, so `offset` and `limit` can't be swapped. */
export type PageRequest = {
    offset: number;
    limit: number;
};

type FetchAllOptions = {
    /** Stop once this many rows are held, even if `total` promises more. */
    maxRows?: number;
};

/**
 * Call `fetchPage` until every row `total` promises has been collected (or
 * `maxRows` is reached), and return them merged.
 *
 * The next offset is the number of rows collected so far, not `page * limit`,
 * so a short page self-corrects instead of leaving a hole. Rows can still
 * repeat if the underlying list shifts between requests (offset paging's
 * inherent race) — callers that care about identity should de-duplicate.
 *
 * `total` comes back as the server reported it, never clamped down to the rows
 * held, so `total > items.length` remains a reliable "there is more" signal for
 * `maxRows` callers.
 */
export const fetchAllPages = async <T>(
    fetchPage: (request: PageRequest) => Promise<Page<T>>,
    { maxRows = Infinity }: FetchAllOptions = {}
): Promise<Page<T>> => {
    const first = await fetchPage({ offset: 0, limit: PAGE_SIZE });
    const items = [...first.items];
    let total = first.total;

    for (let page = 1; items.length < Math.min(total, maxRows); page += 1) {
        if (page >= MAX_PAGES) {
            console.warn(
                `fetchAllPages: stopped at ${MAX_PAGES} pages with ${items.length} of ${total} rows`
            );
            break;
        }
        const next = await fetchPage({ offset: items.length, limit: PAGE_SIZE });
        // An empty page when more rows were promised means `total` is stale or
        // wrong; stop rather than request the same offset forever.
        if (next.items.length === 0) break;
        items.push(...next.items);
        total = next.total;
    }

    // `total` can lag what we actually hold if rows were added mid-walk.
    return { items, total: Math.max(total, items.length) };
};
