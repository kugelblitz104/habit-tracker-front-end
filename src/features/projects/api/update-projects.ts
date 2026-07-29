import type { ProjectRead, ProjectUpdate } from '@/api';
import { ProjectsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

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

export const useUpdateProject = defineMutationHook(updateProject, (queryClient, data) => {
    queryClient.invalidateQueries({
        queryKey: ['projects', { profileId: data.profile_id }]
    });
    queryClient.invalidateQueries({
        queryKey: ['project', { projectId: data.id }]
    });
});
