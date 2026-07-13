import { TasksService } from '@/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Persist a manual sibling order. `taskIds` are the sibling task IDs (e.g. one
 * parent's subtasks) in the desired display order; the first gets the lowest
 * sort_order. See `PUT /tasks/sort`.
 */
export const sortTasks = async (taskIds: number[]): Promise<void> => {
    await TasksService.sortTasksTasksSortPut(taskIds);
};

export const useSortTasks = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: sortTasks,
        // Refetch the profile's tasks so every surface picks up the new
        // sort_order (subtasks arrive in the same list response).
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
    });
};
