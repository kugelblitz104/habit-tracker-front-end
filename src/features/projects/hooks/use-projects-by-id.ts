import type { ProjectRead } from '@/api';
import { useMemo } from 'react';

/**
 * Map a project list by id, for surfaces (Today, All tasks) that render many
 * tasks against the full project list and need to look up each one's project
 * tag by `project_id`. Pass a stable reference — e.g. `projectsQuery.data?.projects`
 * directly — so the memo dependency doesn't change every render.
 */
export const useProjectsById = (projects: ProjectRead[] | undefined) => {
    return useMemo(() => {
        const map = new Map<number, ProjectRead>();
        for (const project of projects ?? []) {
            map.set(project.id, project);
        }
        return map;
    }, [projects]);
};
