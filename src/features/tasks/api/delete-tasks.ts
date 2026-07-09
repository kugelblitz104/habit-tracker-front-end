import { TasksService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const deleteTask = async (taskId: number): Promise<unknown> => {
    return await TasksService.deleteTaskTasksTaskIdDelete(taskId);
};

type UseDeleteTaskOptions = {
    mutationConfig?: MutationConfig<typeof deleteTask>;
};

export const useDeleteTask = ({ mutationConfig }: UseDeleteTaskOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: deleteTask,
        onSuccess: (...args) => {
            // The profile/project scope is unknown from the id alone, so refresh
            // all task lists and all project data (list + details) — this keeps
            // the /projects/:id "N open · N done" + progress bar in sync after a
            // delete.
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project'] });
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
