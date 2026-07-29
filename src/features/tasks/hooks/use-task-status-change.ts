import type { TaskRead } from '@/api';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { toastTaskClosed } from '@/features/tasks/utils/task-status-toast';
import { apiErrorMessage } from '@/lib/api-error-message';
import { TaskStatus } from '@/types/types';
import { toast } from 'react-toastify';

/**
 * Shared status-change handler for Today, All tasks and the project view:
 * looks up the task's previous status in `tasks`, persists the new one, and
 * on success raises a tap-to-undo toast for discrete completions (DONE /
 * CANCELLED) only — not every status shuffle, so feedback stays meaningful
 * rather than noisy. Errors toast via `apiErrorMessage`.
 */
export const useTaskStatusChange = (tasks: TaskRead[]) => {
    const updateTask = useUpdateTask();

    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        // Remember where the task was so the toast can put it back on undo.
        const previous = tasks.find((t) => t.id === taskId)?.status;
        updateTask.mutate(
            { taskId, data: { status } },
            {
                // Only toast discrete, intentional completions — not every status
                // shuffle — so feedback stays meaningful rather than noisy. The
                // toast doubles as a tap-to-undo for a few seconds.
                onSuccess: () => {
                    if (status === TaskStatus.DONE || status === TaskStatus.CANCELLED) {
                        toastTaskClosed(
                            status === TaskStatus.DONE ? 'done' : 'cancelled',
                            previous != null && previous !== status
                                ? () => updateTask.mutate({ taskId, data: { status: previous } })
                                : undefined
                        );
                    }
                },
                onError: (error) =>
                    toast.error(apiErrorMessage(error, 'Failed to update task status'))
            }
        );
    };

    return handleStatusChange;
};
