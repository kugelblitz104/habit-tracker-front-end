import { ProjectsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const deleteProject = async (projectId: number): Promise<unknown> => {
    return await ProjectsService.deleteProjectProjectsProjectIdDelete(projectId);
};

export const useDeleteProject = defineMutationHook(
    deleteProject,
    (queryClient, _data, projectId) => {
        // Project scope is unknown from the id alone; refresh all project lists.
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        // Drop the deleted project's detail query so nothing refetches a 404.
        queryClient.removeQueries({ queryKey: ['project', { projectId }] });
        // The backend keeps the project's tasks but nulls their project_id, so
        // every task list/detail that shows a project tag must refetch.
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['task'] });
    }
);
