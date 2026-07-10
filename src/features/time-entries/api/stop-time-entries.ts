import type { TimeEntryRead } from '@/api';
import { TimeEntriesService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateTimeEntries } from './query-keys';

export const stopTimeEntry = async (entryId: number): Promise<TimeEntryRead> => {
    return await TimeEntriesService.stopTimeEntryTimeEntriesEntryIdStopPost(entryId);
};

type UseStopTimeEntryOptions = {
    mutationConfig?: MutationConfig<typeof stopTimeEntry>;
};

/** Stop a running timer; the server stamps ended_at and computes the duration. */
export const useStopTimeEntry = ({ mutationConfig }: UseStopTimeEntryOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: stopTimeEntry,
        onSuccess: (data, ...args) => {
            invalidateTimeEntries(queryClient, data.profile_id);
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
