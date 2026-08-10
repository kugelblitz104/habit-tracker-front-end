import type { TaskRead } from '@/api';
import { TasksService } from '@/api';
import { PAGE_SIZE } from '@/lib/paginate';
import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';

/**
 * The profile's closed tasks, one page at a time.
 *
 * Deliberately not `getTasks`. That function promises to return *every* row,
 * because its consumers filter client-side and a partial list reads as missing
 * data rather than as page one of many. The Closed disclosure is the one
 * surface that genuinely wants the opposite: it is collapsed by default, shows
 * a count, and mounts on three screens (Today, All tasks, every project view),
 * so walking a long history in full on each of them costs up to 50 requests and
 * thousands of DOM rows for something nobody has opened yet.
 *
 * `GET /tasks/` orders this exact query (`band=hidden` + `include_closed`) by
 * `closed_date DESC` rather than the default priority ordering, so page one is
 * the most recently closed 100 and paging walks backwards through history. A
 * bounded fetch would return an arbitrary slice under any other ordering.
 */

type ClosedTasksParams = {
    profileId: number | null | undefined;
    /** Scope to one project's closed tasks (project view). */
    projectId?: number | null;
};

type ClosedTasksPage = {
    tasks: TaskRead[];
    /** Server-reported match count, used to decide whether another page exists. */
    total: number;
};

const getClosedTasksPage = async (
    { profileId, projectId }: ClosedTasksParams,
    offset: number
): Promise<ClosedTasksPage> => {
    const page = await TasksService.listTasksTasksGet(
        profileId!,
        projectId ?? undefined,
        'hidden',
        null,
        true,
        PAGE_SIZE,
        offset
    );
    return { tasks: page.tasks ?? [], total: page.total };
};

/** First occurrence of each id wins. Offset paging can repeat a row when the
 *  list shifts mid-walk, and duplicate ids collide as React keys. */
const dedupeById = (tasks: TaskRead[]): TaskRead[] => {
    const byId = new Map<number, TaskRead>();
    for (const task of tasks) {
        if (!byId.has(task.id)) byId.set(task.id, task);
    }
    return [...byId.values()];
};

export const getClosedTasksQueryOptions = ({ profileId, projectId = null }: ClosedTasksParams) =>
    infiniteQueryOptions({
        // The `['tasks', …]` prefix is load-bearing: `useUpdateTask` and friends
        // invalidate `['tasks', { profileId }]`, and TanStack matches object keys
        // partially, so this query refreshes with the active-band lists when a
        // task is closed or reopened. Renaming the prefix would silently strand
        // it until staleTime expired.
        queryKey: ['tasks', { profileId, projectId, closed: true }],
        queryFn: ({ pageParam }) => getClosedTasksPage({ profileId, projectId }, pageParam),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            // An empty page when more rows were promised means `total` is stale;
            // stop rather than request the same offset forever.
            if (lastPage.tasks.length === 0) return undefined;
            const loaded = allPages.reduce((count, page) => count + page.tasks.length, 0);
            return loaded < lastPage.total ? loaded : undefined;
        },
        select: (data) => ({
            ...data,
            tasks: dedupeById(data.pages.flatMap((page) => page.tasks))
        }),
        enabled: !!profileId
    });

export const useClosedTasks = (params: ClosedTasksParams) =>
    useInfiniteQuery(getClosedTasksQueryOptions(params));
