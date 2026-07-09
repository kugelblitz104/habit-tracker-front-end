import type { ProjectList, ProjectRead } from '@/api';
import { ProjectsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getProjects = async (
    profileId: number,
    includeArchived = false
): Promise<ProjectList> => {
    return await ProjectsService.listProjectsProjectsGet(profileId, includeArchived);
};

export const getProject = async (projectId: number): Promise<ProjectRead> => {
    if (!projectId) throw new Error('projectId is required');
    return await ProjectsService.readProjectProjectsProjectIdGet(projectId);
};

export const getProjectsQueryOptions = (
    profileId: number | null | undefined,
    includeArchived = false
) => {
    return queryOptions({
        queryKey: ['projects', { profileId, includeArchived }],
        queryFn: () => getProjects(profileId!, includeArchived),
        enabled: !!profileId
    });
};

export const getProjectQueryOptions = (projectId: number | null | undefined) => {
    return queryOptions({
        queryKey: ['project', { projectId }],
        queryFn: () => getProject(projectId!),
        enabled: !!projectId
    });
};

type UseProjectsOptions = {
    profileId: number | null | undefined;
    includeArchived?: boolean;
    queryConfig?: QueryConfig<typeof getProjectsQueryOptions>;
};

export const useProjects = ({
    profileId,
    includeArchived = false,
    queryConfig
}: UseProjectsOptions) => {
    return useQuery({
        ...getProjectsQueryOptions(profileId, includeArchived),
        ...queryConfig
    });
};

type UseProjectOptions = {
    projectId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getProjectQueryOptions>;
};

export const useProject = ({ projectId, queryConfig }: UseProjectOptions) => {
    return useQuery({
        ...getProjectQueryOptions(projectId),
        ...queryConfig
    });
};
