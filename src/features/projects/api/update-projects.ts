import type { ProjectRead, ProjectUpdate } from '@/api';
import { ProjectsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type UpdateProjectInput = {
    projectId: number;
    data: ProjectUpdate;
};

export const updateProject = async ({
    projectId,
    data
}: UpdateProjectInput): Promise<ProjectRead> => {
    return await ProjectsService.patchProjectProjectsProjectIdPatch(projectId, data);
};

type UseUpdateProjectOptions = {
    mutationConfig?: MutationConfig<typeof updateProject>;
};

export const useUpdateProject = ({ mutationConfig }: UseUpdateProjectOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: updateProject,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({
                queryKey: ['projects', { profileId: data.profile_id }]
            });
            queryClient.invalidateQueries({
                queryKey: ['project', { projectId: data.id }]
            });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
