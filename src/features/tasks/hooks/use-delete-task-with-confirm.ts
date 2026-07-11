import { toast } from 'react-toastify';
import { useDeleteTask } from '../api/delete-tasks';

type DeleteWithConfirmOptions = {
    /** Run after a successful delete (e.g. close a pane/editor). */
    onSuccess?: () => void;
};

/**
 * Shared "Delete this task?" confirm + mutate + toast flow, used by the card
 * context menu, the task detail body, and the task editor. Confirms via
 * `window.confirm`, then fires the shared delete mutation with the standard
 * success/error toasts; `opts.onSuccess` runs after the success toast.
 * Also exposes the underlying mutation's `isPending` so callers can disable
 * their delete button while the request is in flight.
 */
export const useDeleteTaskWithConfirm = () => {
    const deleteTask = useDeleteTask();

    const deleteWithConfirm = (taskId: number, opts?: DeleteWithConfirmOptions) => {
        if (deleteTask.isPending) return;
        if (!window.confirm('Delete this task? This cannot be undone.')) return;
        deleteTask.mutate(taskId, {
            onSuccess: () => {
                toast.success('Task deleted');
                opts?.onSuccess?.();
            },
            onError: () => toast.error('Failed to delete task. Please try again.')
        });
    };

    return { deleteWithConfirm, isPending: deleteTask.isPending };
};
