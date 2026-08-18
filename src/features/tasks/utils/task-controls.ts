import type { ProjectRead, TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { STATUS_META } from '../components/status-config';
import { bandRank, computeBand, startOfToday } from './compute-band';
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

/**
 * Inter-status sort rank (lower = higher up the list). Drives the "smart" sort
 * on every task surface: what you're actively doing floats to the top, then the
 * things you can act on, then the things parked on someone/something else, with
 * deferred always last among active statuses and done/cancelled at the very
 * bottom. Within a single rank, tasks fall back to priority + due date.
 *
 *   in progress → open → scheduled → pending → blocked → needs info
 *   → deferred → done → cancelled
 *
 * "Pending" (work done on my end, waiting for others) sits above blocked/needs
 * info: it's not actionable by me, but it's ahead of things I'm actively
 * stuck on. Done/cancelled only reach the ranking on surfaces that keep them
 * inline (e.g. subtasks); the main list peels them into the Closed section.
 */
const STATUS_RANK: Record<number, number> = {
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.OPEN]: 1,
    [TaskStatus.SCHEDULED]: 2,
    [TaskStatus.PENDING]: 3,
    [TaskStatus.BLOCKED]: 4,
    [TaskStatus.NEEDS_INFO]: 5,
    [TaskStatus.DEFERRED]: 6,
    [TaskStatus.DONE]: 7,
    [TaskStatus.CANCELLED]: 8
};
/** Rank for the smart sort; unknown statuses sort as OPEN (a safe middle). */
export const statusRank = (status: number): number =>
    STATUS_RANK[status] ?? STATUS_RANK[TaskStatus.OPEN]!;

// Section header order for `groupBy: 'status'`, aligned with the smart-sort rank.
const STATUS_ORDER = [
    TaskStatus.IN_PROGRESS,
    TaskStatus.OPEN,
    TaskStatus.SCHEDULED,
    TaskStatus.PENDING,
    TaskStatus.BLOCKED,
    TaskStatus.NEEDS_INFO,
    TaskStatus.DEFERRED,
    TaskStatus.DONE,
    TaskStatus.CANCELLED
];

/** Done/cancelled — these never interleave in the main grouped list; they
 *  render in the separate "Closed" section (CompletedSection) instead. */
const CLOSED_STATUS_VALUES: number[] = [TaskStatus.DONE, TaskStatus.CANCELLED];
export const isClosedStatus = (status: number): boolean => CLOSED_STATUS_VALUES.includes(status);

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

const sameSet = (a: number[], b: number[]): boolean =>
    a.length === b.length && a.every((v) => b.includes(v));

// Named per-filter predicates. `isDefaultControls` and `activeFilterCount`
// both build on these rather than repeating the comparisons inline, so a
// change to what counts as "filtering" (e.g. a fifth filter, or a change to
// what a filter's default is) only has to happen once and both callers move
// together.
const projectFilterActive = (c: TaskControlsState): boolean => c.filterProjectId !== 'all';
const priorityFilterActive = (c: TaskControlsState): boolean =>
    !sameSet(c.filterPriorities, ALL_PRIORITY_VALUES);
const statusFilterActive = (c: TaskControlsState): boolean =>
    !sameSet(c.filterStatuses, ACTIVE_STATUS_VALUES);
/** True whenever a date field is picked, regardless of whether a range is set
 *  on top of it. Deliberately blind to `dateFrom`/`dateTo` on their own; see
 *  `isDefaultControls` for the one caller that also needs those. */
const dateFilterActive = (c: TaskControlsState): boolean => c.dateField !== null;

/**
 * Whether the controls are still at their defaults (nothing grouped, smart
 * sort, no priority/status/project/date filter active). Gates the Reset
 * affordance so it only shows once the user has actually changed something.
 * Shares the four `*FilterActive` predicates with `activeFilterCount`, so a
 * change to what counts as filtering can't update one and miss the other.
 *
 * The extra `dateFrom`/`dateTo` comparisons below are a deliberate, narrower
 * exception on top of that shared base: `isDefaultControls` also treats a
 * lingering range as non-default even with no `dateField` selected, which
 * `dateFilterActive`/`activeFilterCount` do not (they only ask "is a filter
 * currently applied", and an unset field applies none). That state isn't
 * reachable through the shipped `DateFilterFields` UI, which always clears
 * all three date fields together, and it doesn't affect filtering, since
 * `passesDateFilter` short-circuits on `!dateField`. It is reachable by
 * constructing `TaskControlsState` directly, which is reason enough for
 * `isDefaultControls` to keep the extra check rather than rely on it never
 * happening.
 */
export const isDefaultControls = (c: TaskControlsState): boolean =>
    c.groupBy === DEFAULT_TASK_CONTROLS.groupBy &&
    c.sortBy === DEFAULT_TASK_CONTROLS.sortBy &&
    c.sortDir === DEFAULT_TASK_CONTROLS.sortDir &&
    !projectFilterActive(c) &&
    !priorityFilterActive(c) &&
    !statusFilterActive(c) &&
    !dateFilterActive(c) &&
    c.dateFrom === DEFAULT_TASK_CONTROLS.dateFrom &&
    c.dateTo === DEFAULT_TASK_CONTROLS.dateTo;

/**
 * How many filters are off their default. Counts filters, not selections: 7 of 9
 * statuses checked is the default and counts zero, which is the thing the old
 * "Status (7)" button got wrong. Group and sort are arrangement, not filtering,
 * so they never count.
 */
export const activeFilterCount = (c: TaskControlsState): number =>
    [projectFilterActive, priorityFilterActive, statusFilterActive, dateFilterActive].filter(
        (active) => active(c)
    ).length;

export type FilterChip = {
    key: string;
    label: string;
    /** The patch that returns just this filter to its default. */
    reset: Partial<TaskControlsState>;
};

/** One removable chip per non-default filter, in bar order. */
export const activeFilterChips = (c: TaskControlsState, projects: ProjectRead[]): FilterChip[] => {
    const chips: FilterChip[] = [];

    if (projectFilterActive(c)) {
        const name =
            c.filterProjectId === 'none'
                ? 'None'
                : (projects.find((p) => p.id === c.filterProjectId)?.name ?? 'Unknown');
        chips.push({
            key: 'project',
            label: `Project: ${name}`,
            reset: { filterProjectId: DEFAULT_TASK_CONTROLS.filterProjectId }
        });
    }

    if (priorityFilterActive(c)) {
        const names = PRIORITY_ORDER.filter((p) => c.filterPriorities.includes(p)).map(
            (p) => PRIORITY_LABELS[p]!
        );
        chips.push({
            key: 'priority',
            label: `Priority: ${names.join(', ') || 'None'}`,
            reset: { filterPriorities: [...DEFAULT_TASK_CONTROLS.filterPriorities] }
        });
    }

    if (statusFilterActive(c)) {
        const names = STATUS_ORDER.filter((s) => c.filterStatuses.includes(s)).map(
            (s) => STATUS_META[s]!.label
        );
        chips.push({
            key: 'status',
            label: `Status: ${names.join(', ') || 'None'}`,
            reset: { filterStatuses: [...DEFAULT_TASK_CONTROLS.filterStatuses] }
        });
    }

    if (dateFilterActive(c)) {
        const range = c.dateFrom || c.dateTo ? ` ${c.dateFrom || '…'} → ${c.dateTo || '…'}` : '';
        chips.push({
            key: 'date',
            label: `Date: ${TASK_DATE_FIELD_LABELS[c.dateField!]}${range}`,
            reset: { dateField: null, dateFrom: '', dateTo: '' }
        });
    }

    return chips;
};

export type TaskSection = {
    key: string;
    /** Section header; null renders no header (flat list). */
    label: string | null;
    color?: string;
    tasks: TaskRead[];
};

export { PRIORITY_LABELS };

export const compareSmart = (a: TaskRead, b: TaskRead): number => {
    // Status rank first (in progress → open → scheduled → pending → blocked →
    // needs info → deferred → done → cancelled), then priority + due date
    // within the same rank so every band is ordered by what's most pressing.
    const ra = statusRank(a.status ?? 0);
    const rb = statusRank(b.status ?? 0);
    if (ra !== rb) return ra - rb;
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa; // priority desc
    const da = a.due_date ?? '';
    const db = b.due_date ?? '';
    if (!!da !== !!db) return da ? -1 : 1; // due asc, nulls last
    if (da !== db) return da < db ? -1 : 1;
    return a.created_date.localeCompare(b.created_date);
};

/**
 * The smart ordering used by the flat surfaces: band first, then the same
 * within-band ranking Today applies. Band ranks are precomputed per task into
 * a Map rather than derived inside the comparator, which would recompute them
 * O(n log n) times.
 */
export const compareSmartBanded = (
    tasks: TaskRead[],
    today: Date = startOfToday()
): ((a: TaskRead, b: TaskRead) => number) => {
    const ranks = new Map<number, number>(
        tasks.map((task) => [task.id, bandRank(computeBand(task, today))])
    );
    return (a, b) => {
        const rankA = ranks.get(a.id) ?? 2;
        const rankB = ranks.get(b.id) ?? 2;
        if (rankA !== rankB) return rankA - rankB;
        return compareSmart(a, b);
    };
};

export const sortTasks = (
    tasks: TaskRead[],
    sortBy: TaskSortBy,
    dir: TaskSortDir,
    today: Date = startOfToday()
): TaskRead[] => {
    const asc = dir === 'asc';
    const sorted = [...tasks];
    switch (sortBy) {
        case 'smart':
            sorted.sort(compareSmartBanded(sorted, today));
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
    projectsById: Map<number, ProjectRead>,
    today: Date = startOfToday()
): TaskSection[] => {
    const { active: filtered } = splitTasksForControls(tasks, controls);

    if (controls.groupBy === 'none') {
        return [
            {
                key: 'all',
                label: null,
                tasks: sortTasks(filtered, controls.sortBy, controls.sortDir, today)
            }
        ];
    }

    const sortSection = (list: TaskRead[]) =>
        sortTasks(list, controls.sortBy, controls.sortDir, today);

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
