import type { CountdownList, CountdownRead } from '@/api';
import { CountdownsService } from '@/api';
import { fetchAllPages, PAGE_SIZE } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { countdownKeys } from './query-keys';

/**
 * Fetch a profile's countdowns, all of them.
 *
 * `archived` picks which list: live ones (the default) or the retired ones, never
 * both: the API filters on `archived_date`. Paging is this function's business,
 * not the caller's: every surface groups and filters the result client-side, so a
 * truncated page (the API's 100-row cap) would read as missing countdowns rather
 * than as page one of many.
 */
export const getCountdowns = async (
    profileId: number,
    archived = false
): Promise<CountdownList> => {
    // No dedupeById: the list is ordered by target_date, which nothing in the UI
    // mutates mid-walk.
    const { items, total } = await fetchAllPages<CountdownRead>(async ({ offset, limit }) => {
        const page = await CountdownsService.listCountdownsCountdownsGet(
            profileId,
            limit,
            offset,
            archived
        );
        return { items: page.countdowns ?? [], total: page.total };
    });

    // `limit` is the page size the walk asked for, not the row count it ended up
    // with; `total` already reports how many rows there are.
    return { countdowns: items, total, limit: PAGE_SIZE, offset: 0 };
};

export const getCountdownsQueryOptions = (profileId: number | null | undefined, archived = false) =>
    queryOptions({
        queryKey: countdownKeys.list(profileId, archived),
        queryFn: () => getCountdowns(profileId!, archived),
        enabled: !!profileId
    });

type UseCountdownsOptions = {
    profileId: number | null | undefined;
    /** True fetches the archived countdowns instead of the live ones. */
    archived?: boolean;
    queryConfig?: QueryConfig<typeof getCountdownsQueryOptions>;
};

export const useCountdowns = ({ profileId, archived = false, queryConfig }: UseCountdownsOptions) =>
    useQuery({
        ...getCountdownsQueryOptions(profileId, archived),
        ...queryConfig
    });
