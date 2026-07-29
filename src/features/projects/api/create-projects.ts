import type { ProjectCreate, ProjectRead } from '@/api';
import { ProjectsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const createProject = async (project: ProjectCreate): Promise<ProjectRead> => {
    return await ProjectsService.createProjectProjectsPost(project);
};

export const useCreateProject = defineMutationHook(createProject, (queryClient, data) => {
    queryClient.invalidateQueries({
        queryKey: ['projects', { profileId: data.profile_id }]
    });
});
