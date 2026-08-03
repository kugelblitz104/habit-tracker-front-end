import type { TaskList, TaskRead } from '@/api';
import { TasksService } from '@/api';
import { fetchAllPages } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import type { TaskBand } from '@/types/types';
import { queryOptions, useQuery } from '@tanstack/react-query';

export type TaskListParams = {
    profileId: number | null | undefined;
    projectId?: number | null;
    /** Only this parent's subtasks. Server-side filter — see `getTasks`. */
    parentId?: number | null;
    band?: TaskBand | null;
    status?: number | null;
    includeClosed?: boolean;
    /**
     * Stop after this many rows instead of fetching the whole list. Only for
     * consumers that bound their read on purpose and surface it (the Insights
     * dashboard reads 500 and notes the cap); leave unset everywhere else, or
     * client-side filtering silently operates on a partial list.
     */
    maxRows?: number;
};

/** First occurrence of each id wins. */
const dedupeById = (tasks: TaskRead[]): TaskRead[] => {
    const byId = new Map<number, TaskRead>();
    for (const task of tasks) {
        if (!byId.has(task.id)) byId.set(task.id, task);
    }
    return [...byId.values()];
};

/**
 * Fetch a profile's tasks — all of them.
 *
 * Every consumer filters this list client-side (subtasks by `parent_id`, cards
 * by band, search by title), so a partial list reads as missing data rather
 * than as one page of many: with 115 tasks and the API's 100-row cap, a task's
 * subtasks were the rows that vanished. `limit`/`offset` are deliberately not
 * caller-facing — paging is this function's business, not the call sites'.
 */
export const getTasks = async (params: TaskListParams): Promise<TaskList> => {
    const { profileId, projectId, band, status, includeClosed, parentId, maxRows } = params;

    const { items, total } = await fetchAllPages<TaskRead>(
        async ({ offset, limit }) => {
            const page = await TasksService.listTasksTasksGet(
                profileId!,
                projectId,
                band,
                status,
                includeClosed,
                limit,
                offset,
                parentId
            );
            return { items: page.tasks ?? [], total: page.total };
        },
        { maxRows }
    );

    // Offset paging can repeat a row when the list shifts mid-walk (a task
    // created between requests reorders it), and duplicate ids would collide as
    // React keys.
    const tasks = dedupeById(items);

    // `total` stays as the server reported it, so a `maxRows` caller can still
    // see `total > tasks.length` and say so. Without `maxRows` the walk is
    // complete and the two agree.
    return { tasks, total, limit: tasks.length, offset: 0 };
};

export const getTask = async (taskId: number): Promise<TaskRead> => {
    if (!taskId) throw new Error('taskId is required');
    return await TasksService.readTaskTasksTaskIdGet(taskId);
};

export const getTasksQueryOptions = (params: TaskListParams) => {
    const {
        profileId,
        projectId = null,
        parentId = null,
        band = null,
        status = null,
        includeClosed = false,
        maxRows = null
    } = params;
    return queryOptions({
        queryKey: [
            'tasks',
            { profileId, projectId, parentId, band, status, includeClosed, maxRows }
        ],
        queryFn: () => getTasks(params),
        enabled: !!profileId
    });
};

export const getTaskQueryOptions = (taskId: number | null | undefined) => {
    return queryOptions({
        queryKey: ['task', { taskId }],
        queryFn: () => getTask(taskId!),
        enabled: !!taskId
    });
};

/**
 * Resolve a readable task URL (`/tasks/setup-utilities`) to its task.
 *
 * Slugs are unique per profile, not globally, so this needs the profile as well
 * as the slug: a slug from another profile returns 404 rather than the wrong
 * task.
 */
export const getTaskBySlug = async (slug: string, profileId: number): Promise<TaskRead> => {
    if (!slug) throw new Error('slug is required');
    return await TasksService.readTaskBySlugTasksBySlugSlugGet(slug, profileId);
};

export const getTaskBySlugQueryOptions = (
    slug: string | null | undefined,
    profileId: number | null | undefined
) => {
    return queryOptions({
        queryKey: ['task-by-slug', { slug, profileId }],
        queryFn: () => getTaskBySlug(slug!, profileId!),
        enabled: !!slug && !!profileId
    });
};

type UseTasksOptions = TaskListParams & {
    queryConfig?: QueryConfig<typeof getTasksQueryOptions>;
};

export const useTasks = ({ queryConfig, ...params }: UseTasksOptions) => {
    return useQuery({
        ...getTasksQueryOptions(params),
        ...queryConfig
    });
};

type UseTaskOptions = {
    taskId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getTaskQueryOptions>;
};

export const useTask = ({ taskId, queryConfig }: UseTaskOptions) => {
    return useQuery({
        ...getTaskQueryOptions(taskId),
        ...queryConfig
    });
};

type UseTaskBySlugOptions = {
    slug: string | null | undefined;
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getTaskBySlugQueryOptions>;
};

export const useTaskBySlug = ({ slug, profileId, queryConfig }: UseTaskBySlugOptions) => {
    return useQuery({
        ...getTaskBySlugQueryOptions(slug, profileId),
        ...queryConfig
    });
};
