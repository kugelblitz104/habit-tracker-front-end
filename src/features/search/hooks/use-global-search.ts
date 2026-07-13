import type { HabitRead, ProjectRead, TaskRead } from '@/api';
import { getHabits } from '@/features/habits/api/get-habits';
import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { getDueInfo } from '@/features/tasks/utils/task-format';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export type SearchResult =
    | { kind: 'task'; id: number; title: string; meta?: string; task: TaskRead }
    | { kind: 'habit'; id: number; title: string; meta?: string; color: string }
    | { kind: 'project'; id: number; title: string; color: string };

/** Per-group cap so the palette stays scannable on a broad query. */
const GROUP_LIMIT = 8;

/** Case-insensitive: does any of the given fields contain the query? A leading
 *  name/title match ranks ahead of a body-only (notes/etc.) match. */
const scoreMatch = (query: string, primary: string, ...secondary: (string | null | undefined)[]) => {
    const p = primary.toLowerCase();
    if (p.startsWith(query)) return 3;
    if (p.includes(query)) return 2;
    if (secondary.some((s) => s?.toLowerCase().includes(query))) return 1;
    return 0;
};

const rankBy = <T,>(items: { item: T; score: number }[]): T[] =>
    items
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, GROUP_LIMIT)
        .map((r) => r.item);

export type GlobalSearchGroups = {
    tasks: Extract<SearchResult, { kind: 'task' }>[];
    habits: Extract<SearchResult, { kind: 'habit' }>[];
    projects: Extract<SearchResult, { kind: 'project' }>[];
    isLoading: boolean;
    /** Any results at all across the groups. */
    isEmpty: boolean;
};

/**
 * Global search over the active profile's tasks (incl. closed), habits and
 * projects (incl. archived). Data is only fetched while the palette is `open`;
 * the query keys match the per-page lists so it reuses their cache when warm.
 * Matching is a case-insensitive substring on the name/title (and notes/other
 * text as a weaker signal); results are ranked and capped per group.
 */
export const useGlobalSearch = (open: boolean, query: string): GlobalSearchGroups => {
    const { user, activeProfile, activeProfileId } = useAuth();
    const habitsEnabled = activeProfile?.habits_enabled !== false;

    const tasksQuery = useTasks({
        profileId: activeProfileId,
        includeClosed: true,
        queryConfig: { enabled: open && !!activeProfileId }
    });
    const projectsQuery = useProjects({
        profileId: activeProfileId ?? undefined,
        includeArchived: true,
        queryConfig: { enabled: open && !!activeProfileId }
    });
    const habitsQuery = useQuery({
        queryKey: ['habits', { userId: user?.id ?? 0, profileId: activeProfileId }],
        queryFn: () => getHabits(user?.id ?? 0, 100, activeProfileId ?? undefined),
        enabled: open && !!activeProfileId && habitsEnabled,
        staleTime: 1000 * 60
    });

    const q = query.trim().toLowerCase();

    return useMemo(() => {
        const isLoading =
            tasksQuery.isLoading || projectsQuery.isLoading || (habitsEnabled && habitsQuery.isLoading);

        if (!q) {
            return { tasks: [], habits: [], projects: [], isLoading, isEmpty: true };
        }

        const allTasks: TaskRead[] = tasksQuery.data?.tasks ?? [];
        const tasks = rankBy(
            allTasks.map((task) => ({
                item: {
                    kind: 'task' as const,
                    id: task.id,
                    title: task.title,
                    meta: getDueInfo(task.due_date)?.label,
                    task
                },
                score: scoreMatch(q, task.title, task.notes, task.external_ref)
            }))
        );

        const allHabits: HabitRead[] = habitsEnabled ? habitsQuery.data?.habits ?? [] : [];
        const habits = rankBy(
            allHabits.map((habit) => ({
                item: {
                    kind: 'habit' as const,
                    id: habit.id,
                    title: habit.name,
                    meta: habit.category ?? undefined,
                    color: habit.color
                },
                score: scoreMatch(q, habit.name, habit.question, habit.notes, habit.category)
            }))
        );

        const allProjects: ProjectRead[] = projectsQuery.data?.projects ?? [];
        const projects = rankBy(
            allProjects.map((project) => ({
                item: {
                    kind: 'project' as const,
                    id: project.id,
                    title: project.name,
                    color: project.color
                },
                score: scoreMatch(q, project.name, project.notes)
            }))
        );

        return {
            tasks,
            habits,
            projects,
            isLoading,
            isEmpty: tasks.length === 0 && habits.length === 0 && projects.length === 0
        };
    }, [
        q,
        tasksQuery.data,
        tasksQuery.isLoading,
        projectsQuery.data,
        projectsQuery.isLoading,
        habitsQuery.data,
        habitsQuery.isLoading,
        habitsEnabled
    ]);
};
