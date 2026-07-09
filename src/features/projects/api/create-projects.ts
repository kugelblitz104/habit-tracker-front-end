import type { ProjectCreate, ProjectRead } from '@/api';
import { ProjectsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const createProject = async (project: ProjectCreate): Promise<ProjectRead> => {
    return await ProjectsService.createProjectProjectsPost(project);
};

type UseCreateProjectOptions = {
    mutationConfig?: MutationConfig<typeof createProject>;
};

export const useCreateProject = ({ mutationConfig }: UseCreateProjectOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: createProject,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({
                queryKey: ['projects', { profileId: data.profile_id }]
            });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
