import { TasksService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const deleteTask = async (taskId: number): Promise<unknown> => {
    return await TasksService.deleteTaskTasksTaskIdDelete(taskId);
};

export const useDeleteTask = defineMutationHook(deleteTask, (queryClient) => {
    // The profile/project scope is unknown from the id alone, so refresh
    // all task lists and all project data (list + details) — this keeps
    // the /projects/:id "N open · N done" + progress bar in sync after a
    // delete.
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project'] });
});
