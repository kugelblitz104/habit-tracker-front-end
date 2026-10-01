import type { TaskRead, TaskUpdate } from '@/api';
import { TasksService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { getTaskQueryOptions } from './get-tasks';

export type UpdateTaskInput = {
    taskId: number;
    data: TaskUpdate;
};

export const updateTask = async ({ taskId, data }: UpdateTaskInput): Promise<TaskRead> => {
    return await TasksService.patchTaskTasksTaskIdPatch(taskId, data);
};

export const useUpdateTask = defineMutationHook(updateTask, (queryClient, data) => {
    queryClient.invalidateQueries({
        queryKey: ['tasks', { profileId: data.profile_id }]
    });
    // The PATCH response is the full task, so write it straight in: invalidating
    // would leave the old task cached until the refetch lands, and a control
    // opened in that window seeds from it.
    queryClient.setQueryData(getTaskQueryOptions(data.id).queryKey, data);
    // Refresh project open/done counts + progress bar (e.g. after
    // completing a task) — broad, plus the specific project when known.
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    if (data.project_id != null) {
        queryClient.invalidateQueries({
            queryKey: ['project', { projectId: data.project_id }]
        });
    }
    // A subtask status flip changes the parent's subtask done count, so
    // refresh the parent's single-task query too (the list is covered
    // above).
    if (data.parent_id != null) {
        queryClient.invalidateQueries({
            queryKey: ['task', { taskId: data.parent_id }]
        });
    }
});
