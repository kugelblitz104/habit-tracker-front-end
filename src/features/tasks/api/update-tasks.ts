import type { TaskRead, TaskUpdate } from '@/api';
import { TasksService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type UpdateTaskInput = {
    taskId: number;
    data: TaskUpdate;
};

export const updateTask = async ({ taskId, data }: UpdateTaskInput): Promise<TaskRead> => {
    return await TasksService.patchTaskTasksTaskIdPatch(taskId, data);
};

type UseUpdateTaskOptions = {
    mutationConfig?: MutationConfig<typeof updateTask>;
};

export const useUpdateTask = ({ mutationConfig }: UseUpdateTaskOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: updateTask,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({
                queryKey: ['tasks', { profileId: data.profile_id }]
            });
            queryClient.invalidateQueries({ queryKey: ['task', { taskId: data.id }] });
            // Refresh project open/done counts + progress bar (e.g. after
            // completing a task) — broad, plus the specific project when known.
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
