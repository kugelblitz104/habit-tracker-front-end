import type { TimeEntryRead, TimeEntryUpdate } from '@/api';
import { TimeEntriesService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

type UseUpdateTimeEntryOptions = {
    mutationConfig?: MutationConfig<typeof updateTimeEntry>;
};

export const useUpdateTimeEntry = ({ mutationConfig }: UseUpdateTimeEntryOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: updateTimeEntry,
        onSuccess: (data, ...args) => {
            invalidateTimeEntries(queryClient, data.profile_id);
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
