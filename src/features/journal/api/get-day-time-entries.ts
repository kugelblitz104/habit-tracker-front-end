import type { TimeEntryRead } from '@/api';
import { TimeEntriesService } from '@/api';
import { localDayUtcBounds } from '@/lib/date-utils';
import { pagedList } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

/**
 * The time entries that **started** during one local calendar day.
 *
 * Filed by start rather than by overlap, matching the server filter: a session
 * running past midnight counts once, on the day it began, so two consecutive
 * days never report the same entry.
 */
export const getDayTimeEntries = async (
    profileId: number,
    date: string
): Promise<TimeEntryRead[]> => {
    const { from, to } = localDayUtcBounds(date);

    const { items } = await pagedList<TimeEntryRead>(
        async ({ offset, limit }) => {
            const page = await TimeEntriesService.listTimeEntriesTimeEntriesGet(
                profileId,
                undefined, // taskId
                undefined, // projectId
                undefined, // kind
                undefined, // running
                limit,
                offset,
                from,
                to
            );
            return { items: page.time_entries ?? [], total: page.total };
        },
        { identify: (entry) => entry.id }
    );

    return items;
};

export const getDayTimeEntriesQueryOptions = (
    profileId: number | null | undefined,
    date: string
) => {
    const { from, to } = localDayUtcBounds(date);
    return queryOptions({
        queryKey: ['time-entries', { profileId, startedFrom: from, startedTo: to }],
        queryFn: () => getDayTimeEntries(profileId!, date),
        enabled: !!profileId,
        placeholderData: keepPreviousData
    });
};

type UseDayTimeEntriesOptions = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
    queryConfig?: QueryConfig<typeof getDayTimeEntriesQueryOptions>;
};

export const useDayTimeEntries = ({ profileId, date, queryConfig }: UseDayTimeEntriesOptions) =>
    useQuery({
        ...getDayTimeEntriesQueryOptions(profileId, date),
        ...queryConfig
    });
