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

/** The `limit` most list endpoints cap at. Override per call with `pageSize`. */
export const PAGE_SIZE = 100;

/**
 * Hard bound on pages fetched, so a `total` that never converges (rows being
 * added between requests) can't spin forever. Hitting the bound warns rather
 * than truncating in silence.
 */
const MAX_PAGES = 50;

/** Which slice to fetch. An object, so `offset` and `limit` can't be swapped. */
export type PageRequest = {
    offset: number;
    limit: number;
};

type Page<T> = {
    items: T[];
    total: number;
};

export type PagedListOptions<T> = {
    /** Stop once this many rows are held, even if `total` promises more. */
    maxRows?: number;
    /** Stable identity, used to drop rows an offset walk repeated. */
    identify?: (item: T) => number | string;
    /** Rows per request. Only for endpoints whose cap isn't PAGE_SIZE. */
    pageSize?: number;
};

/**
 * Call `fetchPage` until every row `total` promises has been collected (or
 * `maxRows` is reached), and return them merged into a list envelope.
 *
 * The next offset is the number of rows collected so far, not `page * limit`,
 * so a short page self-corrects instead of leaving a hole. Each request asks
 * for no more than the rows still wanted, so `maxRows` is an exact row bound.
 *
 * `total` comes back as the server reported it, never clamped down to the rows
 * held, so `total > items.length` remains a reliable "there is more" signal.
 */
export const pagedList = async <T>(
    fetchPage: (request: PageRequest) => Promise<Page<T>>,
    { maxRows = Infinity, identify, pageSize = PAGE_SIZE }: PagedListOptions<T> = {}
): Promise<Page<T> & { limit: number; offset: number }> => {
    // The API rejects `limit: 0` (`ge=1`), so a non-positive maxRows must never
    // reach fetchPage.
    if (maxRows <= 0) {
        return { items: [], total: 0, limit: pageSize, offset: 0 };
    }

    const items: T[] = [];
    let total = 0;

    for (let page = 0; ; page += 1) {
        const wanted = Math.min(pageSize, maxRows - items.length);
        if (page > 0 && (items.length >= Math.min(total, maxRows) || wanted <= 0)) break;
        if (page >= MAX_PAGES) {
            console.warn(
                `pagedList: stopped at ${MAX_PAGES} pages with ${items.length} of ${total} rows`
            );
            break;
        }

        const next = await fetchPage({ offset: items.length, limit: wanted });
        total = next.total;
        // An empty page when more rows were promised means `total` is stale or
        // wrong; stop rather than request the same offset forever.
        if (next.items.length === 0) break;
        items.push(...next.items);
    }

    const merged = identify ? dedupe(items, identify) : items;

    return {
        items: merged,
        // `total` can lag what we hold if rows were added mid-walk.
        total: Math.max(total, merged.length),
        limit: pageSize,
        offset: 0
    };
};

/** First occurrence of each key wins. */
const dedupe = <T>(items: T[], identify: (item: T) => number | string): T[] => {
    const byKey = new Map<number | string, T>();
    for (const item of items) {
        const key = identify(item);
        if (!byKey.has(key)) byKey.set(key, item);
    }
    return [...byKey.values()];
};
