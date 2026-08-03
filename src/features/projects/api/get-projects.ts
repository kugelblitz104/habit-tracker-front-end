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

/**
 * Resolve a readable project URL (`/projects/alpha-project`) to its project.
 *
 * Slugs are unique per profile, not globally, so this needs the profile as well
 * as the slug: a slug from another profile returns 404 rather than the wrong
 * project.
 */
export const getProjectBySlug = async (slug: string, profileId: number): Promise<ProjectRead> => {
    if (!slug) throw new Error('slug is required');
    return await ProjectsService.readProjectBySlugProjectsBySlugSlugGet(slug, profileId);
};

export const getProjectBySlugQueryOptions = (
    slug: string | null | undefined,
    profileId: number | null | undefined
) => {
    return queryOptions({
        queryKey: ['project-by-slug', { slug, profileId }],
        queryFn: () => getProjectBySlug(slug!, profileId!),
        enabled: !!slug && !!profileId
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

type UseProjectBySlugOptions = {
    slug: string | null | undefined;
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getProjectBySlugQueryOptions>;
};

export const useProjectBySlug = ({ slug, profileId, queryConfig }: UseProjectBySlugOptions) => {
    return useQuery({
        ...getProjectBySlugQueryOptions(slug, profileId),
        ...queryConfig
    });
};

export const useProject = ({ projectId, queryConfig }: UseProjectOptions) => {
    return useQuery({
        ...getProjectQueryOptions(projectId),
        ...queryConfig
    });
};
