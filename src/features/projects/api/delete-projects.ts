import { ProjectsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const deleteProject = async (projectId: number): Promise<unknown> => {
    return await ProjectsService.deleteProjectProjectsProjectIdDelete(projectId);
};

type UseDeleteProjectOptions = {
    mutationConfig?: MutationConfig<typeof deleteProject>;
};

export const useDeleteProject = ({ mutationConfig }: UseDeleteProjectOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: deleteProject,
        onSuccess: (...args) => {
            // Project scope is unknown from the id alone; refresh all project lists.
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
