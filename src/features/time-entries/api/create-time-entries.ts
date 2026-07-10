import type { TimeEntryCreate, TimeEntryRead } from '@/api';
import { TimeEntriesService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateTimeEntries } from './query-keys';

export const createTimeEntry = async (body: TimeEntryCreate): Promise<TimeEntryRead> => {
    return await TimeEntriesService.createTimeEntryTimeEntriesPost(body);
};

type UseCreateTimeEntryOptions = {
    mutationConfig?: MutationConfig<typeof createTimeEntry>;
};

/**
 * Start a running timer (omit `ended_at`) or log a completed entry (send
 * `ended_at`). Only one timer may run per profile — the server returns 409 if
 * one is already running. Invalidates the profile's lists, active-timer
 * indicator and per-task summary.
 */
export const useCreateTimeEntry = ({ mutationConfig }: UseCreateTimeEntryOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: createTimeEntry,
        onSuccess: (data, ...args) => {
            invalidateTimeEntries(queryClient, data.profile_id);
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
