import type { TimeEntryRead } from '@/api';
import { TimeEntriesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateTimeEntries } from './query-keys';

export const stopTimeEntry = async (entryId: number): Promise<TimeEntryRead> => {
    return await TimeEntriesService.stopTimeEntryTimeEntriesEntryIdStopPost(entryId);
};

/** Stop a running timer; the server stamps ended_at and computes the duration. */
export const useStopTimeEntry = defineMutationHook(stopTimeEntry, (queryClient, data) => {
    invalidateTimeEntries(queryClient, data.profile_id);
});
