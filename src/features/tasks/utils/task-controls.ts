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
/** Which task date the date-range filter compares against. */
export type TaskDateField = 'due' | 'scheduled' | 'completed' | 'created';

export const TASK_DATE_FIELD_LABELS: Record<TaskDateField, string> = {
    due: 'Due',
    scheduled: 'Scheduled',
    completed: 'Completed',
    created: 'Created'
};

export type TaskControlsState = {
    groupBy: TaskGroupBy;
    sortBy: TaskSortBy;
    sortDir: TaskSortDir;
    /** number = that project, 'none' = no project, 'all' = don't filter. */
    filterProjectId: number | 'none' | 'all';
    /** Multi-select priority filter — membership test, order doesn't matter. */
    filterPriorities: number[];
    /** Multi-select status filter — membership test, order doesn't matter. */
    filterStatuses: number[];
    /** Date-range filter field; null = no date filtering at all. */
    dateField: TaskDateField | null;
    /** Inclusive range bounds as YYYY-MM-DD; '' means open-ended on that side. */
    dateFrom: string;
    dateTo: string;
};

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

/** Done/cancelled — these never interleave in the main grouped list; they
 *  render in the separate "Closed" section (CompletedSection) instead. */
const CLOSED_STATUS_VALUES: number[] = [TaskStatus.DONE, TaskStatus.CANCELLED];
export const isClosedStatus = (status: number): boolean =>
    CLOSED_STATUS_VALUES.includes(status);

/** Not immediately actionable — blocked/needs-info are waiting on something and
 *  scheduled is slated for later, so these sink to the bottom of their band and
 *  of the "smart" sort, below the tasks you can actually act on now. */
const BACKBURNER_STATUS_VALUES: number[] = [
    TaskStatus.BLOCKED,
    TaskStatus.NEEDS_INFO,
    TaskStatus.SCHEDULED
];
export const isBackburnerStatus = (status: number): boolean =>
    BACKBURNER_STATUS_VALUES.includes(status);

/** Every status value, for a "select all" affordance in the filter UI. */
export const ALL_STATUS_VALUES: number[] = [...STATUS_ORDER];
/** Active (non-closed) statuses — the default Status filter selection. */
export const ACTIVE_STATUS_VALUES: number[] = STATUS_ORDER.filter((s) => !isClosedStatus(s));
/** Every priority value, for a "select all" affordance in the filter UI. */
export const ALL_PRIORITY_VALUES: number[] = [...PRIORITY_ORDER];

export const DEFAULT_TASK_CONTROLS: TaskControlsState = {
    groupBy: 'none',
    sortBy: 'smart',
    sortDir: 'asc',
    filterProjectId: 'all',
    filterPriorities: [...ALL_PRIORITY_VALUES],
    filterStatuses: [...ACTIVE_STATUS_VALUES],
    dateField: null,
    dateFrom: '',
    dateTo: ''
};

export type TaskSection = {
    key: string;
    /** Section header; null renders no header (flat list). */
    label: string | null;
    color?: string;
    tasks: TaskRead[];
};

export { PRIORITY_LABELS };

const compareSmart = (a: TaskRead, b: TaskRead): number => {
    // Back-burner statuses (blocked / needs info / scheduled) sink below the
    // actionable ones regardless of priority or due date.
    const ba = isBackburnerStatus(a.status ?? 0) ? 1 : 0;
    const bb = isBackburnerStatus(b.status ?? 0) ? 1 : 0;
    if (ba !== bb) return ba - bb;
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

/** The task's date (YYYY-MM-DD) for the given filter field, or null when unset.
 *  closed_date/created_date are datetimes — take the date part only. */
const taskDateFor = (task: TaskRead, field: TaskDateField): string | null => {
    switch (field) {
        case 'due':
            return task.due_date ?? null;
        case 'scheduled':
            return task.scheduled_date ?? null;
        case 'completed':
            return task.closed_date ? task.closed_date.split('T')[0]! : null;
        case 'created':
            return task.created_date.split('T')[0]!;
    }
};

/**
 * Whether a task falls within the active date-range filter (inclusive), or
 * true when no date filter is set. A task lacking the selected date (e.g. no
 * due date when filtering by Due) is excluded while the filter is active.
 * Exported so the separately-fetched Closed section can apply the same rule
 * (its own query bypasses buildTaskSections).
 */
export const passesDateFilter = (task: TaskRead, controls: TaskControlsState): boolean => {
    if (!controls.dateField) return true;
    const value = taskDateFor(task, controls.dateField);
    if (!value) return false;
    if (controls.dateFrom && value < controls.dateFrom) return false;
    if (controls.dateTo && value > controls.dateTo) return false;
    return true;
};

const passesFilters = (task: TaskRead, controls: TaskControlsState): boolean => {
    if (controls.filterProjectId === 'none') {
        if (task.project_id != null) return false;
    } else if (controls.filterProjectId !== 'all') {
        if (task.project_id !== controls.filterProjectId) return false;
    }
    if (!controls.filterPriorities.includes(task.priority ?? 0)) return false;
    if (!controls.filterStatuses.includes(task.status ?? 0)) return false;
    if (!passesDateFilter(task, controls)) return false;
    return true;
};

/**
 * Apply the current filters, then split into active vs. closed (done/
 * cancelled). Closed tasks never interleave in the main grouped list — they
 * belong in the separate "Closed" section (CompletedSection), which is gated
 * on `showClosedSection` below.
 */
export const splitTasksForControls = (
    tasks: TaskRead[],
    controls: TaskControlsState
): { active: TaskRead[]; closed: TaskRead[] } => {
    const active: TaskRead[] = [];
    const closed: TaskRead[] = [];
    for (const task of tasks) {
        if (!passesFilters(task, controls)) continue;
        (isClosedStatus(task.status ?? 0) ? closed : active).push(task);
    }
    return { active, closed };
};

/** Whether the Closed section should render at all — i.e. the user has Done
 *  and/or Cancelled checked in the Status filter (both unchecked by default),
 *  or is filtering by completed date (which only closed tasks can satisfy, so
 *  the section is surfaced automatically for that case). */
export const showClosedSection = (controls: TaskControlsState): boolean =>
    controls.filterStatuses.some((s) => isClosedStatus(s)) || controls.dateField === 'completed';

/**
 * Apply the current filters, then group + sort into display sections. Grouping
 * order is fixed (priority high→none, status active→closed, projects A→Z with
 * "No project" last); tasks within each section follow the sort controls.
 * Closed (done/cancelled) tasks are always excluded here — they render in the
 * separate Closed section instead (see `splitTasksForControls`).
 */
export const buildTaskSections = (
    tasks: TaskRead[],
    controls: TaskControlsState,
    projectsById: Map<number, ProjectRead>
): TaskSection[] => {
    const { active: filtered } = splitTasksForControls(tasks, controls);

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
