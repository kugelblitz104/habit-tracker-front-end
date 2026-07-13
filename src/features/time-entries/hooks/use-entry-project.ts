import type { TimeEntryRead } from '@/api';
import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useMemo } from 'react';

export type EntryProject = { name: string; color: string };

type UseEntryProjectOptions = {
    profileId: number | null | undefined;
};

/**
 * Resolves a time entry's associated PROJECT — for a task-attached entry,
 * the task's parent project; for an adhoc (project-attached) entry, that
 * project directly. Fetches the profile's tasks and projects itself; used by
 * RecentEntries to render the project "pip" on the timer page (task/project
 * detail logs don't need it — it's implied there).
 */
export const useEntryProject = ({
    profileId
}: UseEntryProjectOptions): ((entry: TimeEntryRead) => EntryProject | null) => {
    const tasksQuery = useTasks({ profileId });
    const projectsQuery = useProjects({ profileId, includeArchived: true });

    const taskProjectIds = useMemo(() => {
        const map = new Map<number, number | null>();
        for (const task of tasksQuery.data?.tasks ?? []) map.set(task.id, task.project_id ?? null);
        return map;
    }, [tasksQuery.data]);

    const projectsById = useMemo(() => {
        const map = new Map<number, EntryProject>();
        for (const project of projectsQuery.data?.projects ?? [])
            map.set(project.id, { name: project.name, color: project.color });
        return map;
    }, [projectsQuery.data]);

    return (entry: TimeEntryRead): EntryProject | null => {
        let projectId: number | null = null;
        if (entry.task_id != null) {
            projectId = taskProjectIds.get(entry.task_id) ?? null;
        } else if (entry.project_id != null) {
            projectId = entry.project_id;
        }
        return projectId != null ? projectsById.get(projectId) ?? null : null;
    };
};
