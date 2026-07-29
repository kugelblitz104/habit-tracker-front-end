import { useCreateTimeEntry } from '@/features/time-entries/api/create-time-entries';
import { apiErrorMessage } from '@/lib/api-error-message';
import { TimeEntryKind } from '@/types/types';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

/**
 * Shared "start a stopwatch timer for this task" handler for Today, All tasks
 * and the project view. The task context menu and the card's `s` shortcut
 * don't duplicate this logic — they call an `onStartTimer` callback forwarded
 * down from whichever page hook instance is active, so consolidating the 3
 * page-level copies here covers those paths too. No-ops without a resolved
 * profile.
 */
export const useStartTaskTimer = (profileId: number | null | undefined) => {
    const createTimeEntry = useCreateTimeEntry();

    return useCallback(
        (taskId: number) => {
            if (!profileId) return;
            createTimeEntry.mutate(
                { profile_id: profileId, task_id: taskId, kind: TimeEntryKind.STOPWATCH },
                {
                    onSuccess: () => toast.success('Timer started'),
                    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to start timer'))
                }
            );
        },
        [profileId, createTimeEntry]
    );
};
