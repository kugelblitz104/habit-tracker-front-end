import type { JournalEntryList, JournalEntryRead } from '@/api';
import { JournalService } from '@/api';
import { pagedList } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { journalKeys } from './query-keys';

/**
 * Fetch a profile's journal entries in a date range, all of them.
 *
 * Paged via `pagedList` per `paginate.contract.test.ts`: a journal list view
 * renders every entry it gets back, so a truncated page (the API's 100-row
 * cap) would read as missing days rather than as page one of many.
 * `limit`/`offset` are deliberately not caller-facing: paging is this
 * function's business, not the caller's.
 */
export const getJournalEntries = async (
    profileId: number,
    fromDate?: string | null,
    toDate?: string | null
): Promise<JournalEntryList> => {
    const { items, ...envelope } = await pagedList<JournalEntryRead>(async ({ offset, limit }) => {
        const page = await JournalService.listJournalEntriesJournalGet(
            profileId,
            fromDate,
            toDate,
            limit,
            offset
        );
        return { items: page.entries ?? [], total: page.total };
    });

    return { entries: items, ...envelope };
};

export const getJournalEntriesQueryOptions = (
    profileId: number | null | undefined,
    fromDate?: string | null,
    toDate?: string | null
) =>
    queryOptions({
        queryKey: journalKeys.list(profileId, fromDate, toDate),
        queryFn: () => getJournalEntries(profileId!, fromDate, toDate),
        enabled: !!profileId
    });

type UseJournalEntriesOptions = {
    profileId: number | null | undefined;
    /** Only entries on or after this day (`YYYY-MM-DD`). */
    fromDate?: string | null;
    /** Only entries on or before this day (`YYYY-MM-DD`). */
    toDate?: string | null;
    queryConfig?: QueryConfig<typeof getJournalEntriesQueryOptions>;
};

export const useJournalEntries = ({
    profileId,
    fromDate,
    toDate,
    queryConfig
}: UseJournalEntriesOptions) =>
    useQuery({
        ...getJournalEntriesQueryOptions(profileId, fromDate, toDate),
        ...queryConfig
    });
