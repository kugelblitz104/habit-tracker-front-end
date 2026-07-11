import type { TimeEntryRead } from '@/api';
import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useMemo } from 'react';

type UseEntryContextNameOptions = {
    profileId: number | null | undefined;
    /** Also resolve adhoc (project-attached) entries; skip the projects fetch
     *  when a caller only ever shows task-scoped entries. */
    includeProjects?: boolean;
};

/**
 * Resolves a time entry's fallback display name — the task or project it's
 * attached to — for entries with no label of their own. Fetches the profile's
 * tasks (and, when requested, projects) itself; shared by ProjectTimeLog,
 * RecentEntries and ActiveTimerPanel.
 */
export const useEntryContextName = ({
    profileId,
    includeProjects = false
}: UseEntryContextNameOptions): ((entry: TimeEntryRead) => string | null) => {
    const tasksQuery = useTasks({ profileId });
    const projectsQuery = useProjects({
        profileId,
        includeArchived: true,
        queryConfig: { enabled: includeProjects && !!profileId }
    });

    const taskNames = useMemo(() => {
        const map = new Map<number, string>();
        for (const task of tasksQuery.data?.tasks ?? []) map.set(task.id, task.title);
        return map;
    }, [tasksQuery.data]);

    const projectNames = useMemo(() => {
        const map = new Map<number, string>();
        for (const project of projectsQuery.data?.projects ?? []) map.set(project.id, project.name);
        return map;
    }, [projectsQuery.data]);

    return (entry: TimeEntryRead): string | null => {
        if (entry.task_id != null) return taskNames.get(entry.task_id) ?? null;
        if (includeProjects && entry.project_id != null)
            return projectNames.get(entry.project_id) ?? null;
        return null;
    };
};
