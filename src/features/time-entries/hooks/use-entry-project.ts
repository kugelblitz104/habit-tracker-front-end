import type { TimeEntryRead } from '@/api';
import { useProjects } from '@/features/projects/api/get-projects';
import { useMemo } from 'react';

export type EntryProject = { name: string; color: string };

type UseEntryProjectOptions = {
    profileId: number | null | undefined;
};

/**
 * Resolves a time entry's associated PROJECT from the server's own
 * resolved_project_id (the task's project, else its parent task's, else the
 * entry's own). Fetches the profile's projects to render the project "pip" on
 * the timer page (task/project detail logs don't need it, it's implied there).
 */
export const useEntryProject = ({
    profileId
}: UseEntryProjectOptions): ((entry: TimeEntryRead) => EntryProject | null) => {
    const projectsQuery = useProjects({ profileId, includeArchived: true });

    const projectsById = useMemo(() => {
        const map = new Map<number, EntryProject>();
        for (const project of projectsQuery.data?.projects ?? [])
            map.set(project.id, { name: project.name, color: project.color });
        return map;
    }, [projectsQuery.data]);

    return (entry: TimeEntryRead): EntryProject | null => {
        const projectId = entry.resolved_project_id ?? null;
        return projectId != null ? (projectsById.get(projectId) ?? null) : null;
    };
};
