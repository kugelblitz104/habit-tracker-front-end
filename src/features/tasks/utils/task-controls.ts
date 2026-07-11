import type { ProjectRead, TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { STATUS_META } from '../components/status-config';
import { PRIORITY_LABELS } from './priority-config';

/**
 * Sort / group / filter model for the flat task surfaces (the dedicated
 * All-tasks view and the project view). Bands are a Today-only concept; these
 * surfaces let the user re-organize by project / priority / status instead.
 */

export type TaskGroupBy = 'none' | 'project' | 'priority' | 'status';
export type TaskSortBy = 'smart' | 'priority' | 'due' | 'created' | 'title' | 'status';
export type TaskSortDir = 'asc' | 'desc';

export type TaskControlsState = {
    groupBy: TaskGroupBy;
    sortBy: TaskSortBy;
    sortDir: TaskSortDir;
    /** number = that project, 'none' = no project, 'all' = don't filter. */
    filterProjectId: number | 'none' | 'all';
    filterPriority: number | 'all';
    filterStatus: number | 'all';
};

export const DEFAULT_TASK_CONTROLS: TaskControlsState = {
    groupBy: 'none',
    sortBy: 'smart',
    sortDir: 'asc',
    filterProjectId: 'all',
    filterPriority: 'all',
    filterStatus: 'all'
};

type TaskSection = {
    key: string;
    /** Section header; null renders no header (flat list). */
    label: string | null;
    color?: string;
    tasks: TaskRead[];
};

export { PRIORITY_LABELS };

// Fixed section order for the priority / status groupings.
const PRIORITY_ORDER = [3, 2, 1, 0];
const STATUS_ORDER = [
    TaskStatus.IN_PROGRESS,
    TaskStatus.NEEDS_INFO,
    TaskStatus.BLOCKED,
    TaskStatus.SCHEDULED,
    TaskStatus.OPEN,
    TaskStatus.DEFERRED,
    TaskStatus.DONE,
    TaskStatus.CANCELLED
];

const compareSmart = (a: TaskRead, b: TaskRead): number => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa; // priority desc
    const da = a.due_date ?? '';
    const db = b.due_date ?? '';
    if (!!da !== !!db) return da ? -1 : 1; // due asc, nulls last
    if (da !== db) return da < db ? -1 : 1;
    return a.created_date.localeCompare(b.created_date);
};

const sortTasks = (tasks: TaskRead[], sortBy: TaskSortBy, dir: TaskSortDir): TaskRead[] => {
    const asc = dir === 'asc';
    const sorted = [...tasks];
    switch (sortBy) {
        case 'smart':
            sorted.sort(compareSmart);
            if (!asc) sorted.reverse();
            break;
        case 'priority':
            sorted.sort((a, b) => {
                const diff = (a.priority ?? 0) - (b.priority ?? 0);
                return asc ? diff : -diff;
            });
            break;
        case 'due':
            sorted.sort((a, b) => {
                const da = a.due_date ?? '';
                const db = b.due_date ?? '';
                if (!da && !db) return 0;
                if (!da) return 1; // nulls always last
                if (!db) return -1;
                return asc ? da.localeCompare(db) : db.localeCompare(da);
            });
            break;
        case 'created':
            sorted.sort((a, b) => {
                const diff = a.created_date.localeCompare(b.created_date);
                return asc ? diff : -diff;
            });
            break;
        case 'title':
            sorted.sort((a, b) => {
                const diff = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                return asc ? diff : -diff;
            });
            break;
        case 'status':
            sorted.sort((a, b) => {
                const diff = (a.status ?? 0) - (b.status ?? 0);
                return asc ? diff : -diff;
            });
            break;
    }
    return sorted;
};

const passesFilters = (task: TaskRead, controls: TaskControlsState): boolean => {
    if (controls.filterProjectId === 'none') {
        if (task.project_id != null) return false;
    } else if (controls.filterProjectId !== 'all') {
        if (task.project_id !== controls.filterProjectId) return false;
    }
    if (controls.filterPriority !== 'all' && (task.priority ?? 0) !== controls.filterPriority) {
        return false;
    }
    if (controls.filterStatus !== 'all' && (task.status ?? 0) !== controls.filterStatus) {
        return false;
    }
    return true;
};

/**
 * Apply the current filters, then group + sort into display sections. Grouping
 * order is fixed (priority high→none, status active→closed, projects A→Z with
 * "No project" last); tasks within each section follow the sort controls.
 */
export const buildTaskSections = (
    tasks: TaskRead[],
    controls: TaskControlsState,
    projectsById: Map<number, ProjectRead>
): TaskSection[] => {
    const filtered = tasks.filter((task) => passesFilters(task, controls));

    if (controls.groupBy === 'none') {
        return [
            {
                key: 'all',
                label: null,
                tasks: sortTasks(filtered, controls.sortBy, controls.sortDir)
            }
        ];
    }

    const sortSection = (list: TaskRead[]) => sortTasks(list, controls.sortBy, controls.sortDir);

    if (controls.groupBy === 'priority') {
        return PRIORITY_ORDER.map((p) => ({
            key: `priority-${p}`,
            label: PRIORITY_LABELS[p]!,
            tasks: sortSection(filtered.filter((t) => (t.priority ?? 0) === p))
        })).filter((section) => section.tasks.length > 0);
    }

    if (controls.groupBy === 'status') {
        return STATUS_ORDER.map((s) => ({
            key: `status-${s}`,
            label: STATUS_META[s]?.label ?? `Status ${s}`,
            color: STATUS_META[s]?.color,
            tasks: sortSection(filtered.filter((t) => (t.status ?? 0) === s))
        })).filter((section) => section.tasks.length > 0);
    }

    // groupBy === 'project'
    const byProject = new Map<number | 'none', TaskRead[]>();
    for (const task of filtered) {
        const key = task.project_id ?? 'none';
        const list = byProject.get(key) ?? [];
        list.push(task);
        byProject.set(key, list);
    }
    const projectSections: TaskSection[] = [];
    for (const [key, list] of byProject.entries()) {
        if (key === 'none') continue;
        const project = projectsById.get(key);
        projectSections.push({
            key: `project-${key}`,
            label: project?.name ?? 'Project',
            color: project?.color,
            tasks: sortSection(list)
        });
    }
    projectSections.sort((a, b) => a.label!.localeCompare(b.label!));
    const noProject = byProject.get('none');
    if (noProject && noProject.length > 0) {
        projectSections.push({
            key: 'project-none',
            label: 'No project',
            tasks: sortSection(noProject)
        });
    }
    return projectSections;
};
