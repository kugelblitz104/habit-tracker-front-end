import type { TimeEntryList, TimeEntryRead, TimeEntrySummary } from '@/api';
import { TimeEntriesService } from '@/api';
import { pagedList } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import type { TimeEntryKind } from '@/types/types';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { timeEntryKeys } from './query-keys';

export type TimeEntryListParams = {
    profileId: number | null | undefined;
    taskId?: number | null;
    projectId?: number | null;
    kind?: TimeEntryKind | null;
    running?: boolean | null;
    /**
     * Stop after this many rows instead of fetching the whole list. Only for
     * consumers that bound their read on purpose and surface it; leave unset
     * everywhere else, or a client-side sum operates on a partial list.
     */
    maxRows?: number;
};

/**
 * Fetch a profile's time entries, all of them by default.
 *
 * `TaskTimeLog` and `ProjectTimeLog` sum `duration_seconds` over what comes
 * back, so a truncated page renders a wrong total rather than a short list.
 */
export const getTimeEntries = async (params: TimeEntryListParams): Promise<TimeEntryList> => {
    const { profileId, taskId, projectId, kind, running, maxRows } = params;

    const { items, ...envelope } = await pagedList<TimeEntryRead>(
        ({ offset, limit }) =>
            TimeEntriesService.listTimeEntriesTimeEntriesGet(
                profileId!,
                taskId,
                projectId,
                kind,
                running,
                limit,
                offset
            ).then((page) => ({ items: page.time_entries ?? [], total: page.total })),
        { maxRows, identify: (item) => item.id }
    );

    return { time_entries: items, ...envelope };
};

export const getTimeEntriesQueryOptions = (params: TimeEntryListParams) => {
    const {
        profileId,
        taskId = null,
        projectId = null,
        kind = null,
        running = null,
        maxRows = null
    } = params;
    return queryOptions({
        queryKey: timeEntryKeys.list({ profileId, taskId, projectId, kind, running, maxRows }),
        queryFn: () => getTimeEntries(params),
        enabled: !!profileId
    });
};

type UseTimeEntriesOptions = TimeEntryListParams & {
    queryConfig?: QueryConfig<typeof getTimeEntriesQueryOptions>;
};

export const useTimeEntries = ({ queryConfig, ...params }: UseTimeEntriesOptions) => {
    return useQuery({
        ...getTimeEntriesQueryOptions(params),
        ...queryConfig
    });
};

export const getActiveTimeEntry = async (profileId: number): Promise<TimeEntryRead | null> => {
    return await TimeEntriesService.readActiveTimeEntryTimeEntriesActiveGet(profileId);
};

export const getActiveTimeEntryQueryOptions = (profileId: number | null | undefined) => {
    return queryOptions({
        queryKey: timeEntryKeys.active(profileId),
        queryFn: () => getActiveTimeEntry(profileId!),
        enabled: !!profileId
    });
};

type UseActiveTimeEntryOptions = {
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getActiveTimeEntryQueryOptions>;
};

export const useActiveTimeEntry = ({ profileId, queryConfig }: UseActiveTimeEntryOptions) => {
    return useQuery({
        ...getActiveTimeEntryQueryOptions(profileId),
        ...queryConfig
    });
};

export const getTimeEntrySummary = async (profileId: number): Promise<TimeEntrySummary> => {
    return await TimeEntriesService.timeEntrySummaryTimeEntriesSummaryGet(profileId);
};

export const getTimeEntrySummaryQueryOptions = (profileId: number | null | undefined) => {
    return queryOptions({
        queryKey: timeEntryKeys.summary(profileId),
        queryFn: () => getTimeEntrySummary(profileId!),
        enabled: !!profileId
    });
};

type UseTimeEntrySummaryOptions = {
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getTimeEntrySummaryQueryOptions>;
};

export const useTimeEntrySummary = ({ profileId, queryConfig }: UseTimeEntrySummaryOptions) => {
    return useQuery({
        ...getTimeEntrySummaryQueryOptions(profileId),
        ...queryConfig
    });
};
