import type { JournalEntryRead } from '@/api';
import { ApiError, JournalService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { journalKeys } from './query-keys';

/**
 * Fetch one day's journal entry. The API 404s when the day has no entry yet;
 * that is the signal for an unwritten day, not an error, so it resolves to
 * `null` instead of throwing.
 */
export const getJournalEntry = async (
    profileId: number,
    date: string
): Promise<JournalEntryRead | null> => {
    try {
        return await JournalService.readJournalEntryJournalEntryDateGet(date, profileId);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
};

export const getJournalEntryQueryOptions = (profileId: number | null | undefined, date: string) =>
    queryOptions({
        queryKey: journalKeys.day(profileId, date),
        queryFn: () => getJournalEntry(profileId!, date),
        enabled: !!profileId,
        // Each day is its own key, so without this the page empties out on
        // every navigation and repaints when the fetch lands. Callers MUST
        // check `isPlaceholderData`: while it is true the data on screen is
        // the previous day's, and writing it back would save it to the new
        // date.
        placeholderData: keepPreviousData
    });

type UseJournalEntryOptions = {
    profileId: number | null | undefined;
    /** The day, `YYYY-MM-DD`. Must be in the query key: a session left open
     *  across midnight must not keep serving a stale day's cached entry. */
    date: string;
    queryConfig?: QueryConfig<typeof getJournalEntryQueryOptions>;
};

export const useJournalEntry = ({ profileId, date, queryConfig }: UseJournalEntryOptions) =>
    useQuery({
        ...getJournalEntryQueryOptions(profileId, date),
        ...queryConfig
    });
