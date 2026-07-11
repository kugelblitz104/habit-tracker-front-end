import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { toast } from 'react-toastify';
import { useStopTimeEntry } from '../api/stop-time-entries';

type ActiveEntryLike = { id: number } | null | undefined;

/**
 * Stops the running time entry with the guard + success/error toasts shared
 * by the timer screen and the compact Today indicator.
 */
export const useStopActiveTimer = (active: ActiveEntryLike) => {
    const stopTimeEntry = useStopTimeEntry();

    const handleStop = () => {
        if (!active || stopTimeEntry.isPending) return;
        stopTimeEntry.mutate(active.id, {
            onSuccess: () => toast.success('Timer stopped'),
            onError: (error) => toast.error(apiErrorMessage(error, 'Failed to stop timer'))
        });
    };

    return { handleStop, isPending: stopTimeEntry.isPending };
};
