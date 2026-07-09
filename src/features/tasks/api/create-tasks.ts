import type { TaskCreate, TaskRead } from '@/api';
import { TasksService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const createTask = async (task: TaskCreate): Promise<TaskRead> => {
    return await TasksService.createTaskTasksPost(task);
};

type UseCreateTaskOptions = {
    mutationConfig?: MutationConfig<typeof createTask>;
};

/**
 * Quick-capture task creation. Only `profile_id` + `title` are required
 * (everything else is defaulted server-side). Invalidates every task list for
 * the task's profile so the new task lands in its computed band.
 */
export const useCreateTask = ({ mutationConfig }: UseCreateTaskOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: createTask,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({
                queryKey: ['tasks', { profileId: data.profile_id }]
            });
            // Refresh project open/done counts + progress bar (broad, plus the
            // specific project when the new task is scoped to one).
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            if (data.project_id != null) {
                queryClient.invalidateQueries({
                    queryKey: ['project', { projectId: data.project_id }]
                });
            }
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
