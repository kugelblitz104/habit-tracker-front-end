import { TimeEntriesService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

type UseDeleteTimeEntryOptions = {
    mutationConfig?: MutationConfig<typeof deleteTimeEntry>;
};

export const useDeleteTimeEntry = ({ mutationConfig }: UseDeleteTimeEntryOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: deleteTimeEntry,
        onSuccess: (data, variables, ...args) => {
            invalidateTimeEntries(queryClient, variables.profileId);
            onSuccess?.(data, variables, ...args);
        },
        ...restConfig
    });
};
