import type { TaskRead } from '@/api';
import { TasksService } from '@/api';
import { localDayUtcBounds } from '@/lib/date-utils';
import { pagedList } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

/**
 * The tasks closed during one local calendar day, for the journal's live
 * completed-tasks section.
 *
 * The bounds are naive UTC **instants**, not dates. `localDayUtcBounds`
 * turns the local day into the UTC interval that actually contains it;
 * sending the day's own date would file an evening task on the next day,
 * which is the bug this feature exists to fix.
 */
export const getDayTasks = async (profileId: number, date: string): Promise<TaskRead[]> => {
    const { from, to } = localDayUtcBounds(date);

    const { items } = await pagedList<TaskRead>(
        async ({ offset, limit }) => {
            const page = await TasksService.listTasksTasksGet(
                profileId,
                undefined, // projectId: the whole profile's day
                undefined, // closed_only
                undefined, // status: done AND cancelled both count as closed
                true, // includeClosed, required since it defaults to false
                limit,
                offset,
                undefined, // parentId
                from,
                to
            );
            return { items: page.tasks ?? [], total: page.total };
        },
        { identify: (task) => task.id }
    );

    return items;
};

export const getDayTasksQueryOptions = (profileId: number | null | undefined, date: string) => {
    const { from, to } = localDayUtcBounds(date);
    return queryOptions({
        queryKey: ['tasks', { profileId, closedFrom: from, closedTo: to }],
        queryFn: () => getDayTasks(profileId!, date),
        enabled: !!profileId,
        // The list is read-only, so holding the previous day's rows while the
        // next day loads costs nothing and stops the card collapsing to a
        // one-line "Loading…" and growing back on every navigation.
        placeholderData: keepPreviousData
    });
};

type UseDayTasksOptions = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
    queryConfig?: QueryConfig<typeof getDayTasksQueryOptions>;
};

export const useDayTasks = ({ profileId, date, queryConfig }: UseDayTasksOptions) =>
    useQuery({
        ...getDayTasksQueryOptions(profileId, date),
        ...queryConfig
    });

/**
 * The tasks created during one local calendar day, closed ones included.
 *
 * `include_closed` is what makes this "what did the day pick up" rather than
 * "what is still open from that day": a task raised and finished the same
 * morning belongs to the day it was raised on.
 */
export const getDayCreatedTasks = async (profileId: number, date: string): Promise<TaskRead[]> => {
    const { from, to } = localDayUtcBounds(date);

    const { items } = await pagedList<TaskRead>(
        async ({ offset, limit }) => {
            const page = await TasksService.listTasksTasksGet(
                profileId,
                undefined, // projectId
                undefined, // closed_only
                undefined, // status
                true, // includeClosed
                limit,
                offset,
                undefined, // parentId
                undefined, // closedFrom
                undefined, // closedTo
                from,
                to
            );
            return { items: page.tasks ?? [], total: page.total };
        },
        { identify: (task) => task.id }
    );

    return items;
};

export const getDayCreatedTasksQueryOptions = (
    profileId: number | null | undefined,
    date: string
) => {
    const { from, to } = localDayUtcBounds(date);
    return queryOptions({
        queryKey: ['tasks', { profileId, createdFrom: from, createdTo: to }],
        queryFn: () => getDayCreatedTasks(profileId!, date),
        enabled: !!profileId,
        placeholderData: keepPreviousData
    });
};

type UseDayCreatedTasksOptions = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
    queryConfig?: QueryConfig<typeof getDayCreatedTasksQueryOptions>;
};

export const useDayCreatedTasks = ({ profileId, date, queryConfig }: UseDayCreatedTasksOptions) =>
    useQuery({
        ...getDayCreatedTasksQueryOptions(profileId, date),
        ...queryConfig
    });
