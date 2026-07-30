import { TimeEntriesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateTimeEntries } from './query-keys';

export type DeleteTimeEntryInput = {
    entryId: number;
    // Carried through so onSuccess can invalidate the profile's queries — the
    // DELETE response body has no profile_id to read back.
    profileId: number;
};

export const deleteTimeEntry = async ({ entryId }: DeleteTimeEntryInput): Promise<void> => {
    await TimeEntriesService.deleteTimeEntryTimeEntriesEntryIdDelete(entryId);
};

export const useDeleteTimeEntry = defineMutationHook(
    deleteTimeEntry,
    (queryClient, _data, variables) => {
        invalidateTimeEntries(queryClient, variables.profileId);
    }
);
