import type { TimeEntryRead, TimeEntryUpdate } from '@/api';
import { TimeEntriesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateTimeEntries } from './query-keys';

export type UpdateTimeEntryInput = {
    entryId: number;
    data: TimeEntryUpdate;
};

export const updateTimeEntry = async ({
    entryId,
    data
}: UpdateTimeEntryInput): Promise<TimeEntryRead> => {
    return await TimeEntriesService.patchTimeEntryTimeEntriesEntryIdPatch(entryId, data);
};

export const useUpdateTimeEntry = defineMutationHook(updateTimeEntry, (queryClient, data) => {
    invalidateTimeEntries(queryClient, data.profile_id);
});
