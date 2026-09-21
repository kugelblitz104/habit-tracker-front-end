import type { HabitRead, ProfileRead, ProjectRead, TaskRead } from '@/api';
import { isClosedStatus } from '@/features/tasks/utils/task-controls';
import { parseServerDate } from '@/lib/date-utils';

/**
 * The four reconciliation queues, as pure functions.
 *
 * Every criterion reads only server-stamped fields (`created_date`,
 * `updated_date`, `closed_date`, `status`, `archived`), never a voluntary
 * record, and every one takes its window and `now` as arguments so nothing
 * here reads a clock.
 *
 * Each queue ends in the same "and not touched since" clause, which is what
 * makes Keep work: Keep sends an empty PATCH, the server stamps
 * `updated_date`, and the row leaves its queue for one window. Lowering a
 * window can therefore resurrect a row you kept, which is intended - you
 * changed your mind about what counts as too long.
 */

/** Falls back to the app default when the profile has not set one. */
export const DEFAULT_STALE_TASK_DAYS = 60;
export const DEFAULT_STALE_PROJECT_DAYS = 180;
export const DEFAULT_STALE_HABIT_DAYS = 30;

/** Completion rate (0-100, matching `calculateCompletionRate`) below which a
 * habit is dragging. Deliberately not a profile setting: the three windows are
 * judgements about time, this is the queue's own definition. */
export const STRUGGLING_HABIT_RATE = 20;

/** The three windows, resolved from the profile or from the defaults above. */
export type ReconciliationWindows = {
    staleTaskDays: number;
    staleProjectDays: number;
    staleHabitDays: number;
};

type StoredWindows = Pick<
    ProfileRead,
    | 'reconciliation_stale_task_days'
    | 'reconciliation_stale_project_days'
    | 'reconciliation_stale_habit_days'
>;

/**
 * The columns are nullable with no server default, so null means "use the
 * client's default" - each default is written in exactly one place, here.
 */
export const windowsFromProfile = (
    profile: StoredWindows | null | undefined
): ReconciliationWindows => ({
    staleTaskDays: profile?.reconciliation_stale_task_days ?? DEFAULT_STALE_TASK_DAYS,
    staleProjectDays: profile?.reconciliation_stale_project_days ?? DEFAULT_STALE_PROJECT_DAYS,
    staleHabitDays: profile?.reconciliation_stale_habit_days ?? DEFAULT_STALE_HABIT_DAYS
});

type Stamped = { created_date: string; updated_date?: string | null };

/**
 * When anything last touched a row.
 *
 * `updated_date` is nullable and only set on update, so a never-edited row has
 * none - and that row is exactly what a staleness queue is looking for. Reading
 * `updated_date` alone would make it invisible.
 */
export const lastTouched = (row: Stamped): Date =>
    parseServerDate(row.updated_date ?? row.created_date);

// Plain millisecond arithmetic: a DST transition inside the span makes this an
// hour out, which is immaterial against a window measured in weeks.
const cutoff = (now: Date, days: number): Date => new Date(now.getTime() - days * 86_400_000);

const untouchedSince = (row: Stamped, before: Date): boolean => lastTouched(row) < before;

const isActive = (task: TaskRead): boolean => !isClosedStatus(task.status ?? 0);

/** Active top-level tasks nobody has touched for `days`. */
export const staleTasks = (tasks: TaskRead[], days: number, now: Date): TaskRead[] => {
    const before = cutoff(now, days);
    // Subtasks are excluded: one under a live parent is not independently
    // stale, and one under a dead parent belongs to `orphanedSubtasks`.
    // Deferred tasks are deliberately included - "not now" that was never
    // revisited is the graveyard this page exists to clear.
    return tasks.filter(
        (task) => task.parent_id == null && isActive(task) && untouchedSince(task, before)
    );
};

/**
 * Projects with no task closed in `days`, and untouched themselves.
 *
 * `open_count` is deliberately not a gate: a project carrying twelve open tasks
 * and no closures is a more convincing graveyard than an empty one, so gating
 * on zero open tasks would hide the worst cases. The row shows its open count
 * instead, because archiving a project does not cascade to its tasks.
 */
export const quietProjects = (
    projects: ProjectRead[],
    closedTasks: TaskRead[],
    days: number,
    now: Date
): ProjectRead[] => {
    const before = cutoff(now, days);
    const recentlyActive = new Set(
        closedTasks
            .filter((task) => task.closed_date && parseServerDate(task.closed_date) >= before)
            .map((task) => task.project_id)
    );
    return projects.filter(
        (project) =>
            !project.archived && !recentlyActive.has(project.id) && untouchedSince(project, before)
    );
};

/** A habit paired with its completion rate over the window.
 *
 * The rate is supplied rather than computed here because
 * `calculateCompletionRate` reads the clock internally, which would make these
 * criteria untestable. */
export type HabitCandidate = { habit: HabitRead; completionRate: number };

export const strugglingHabits = (
    candidates: HabitCandidate[],
    days: number,
    now: Date
): HabitRead[] => {
    const before = cutoff(now, days);
    // No separate "old enough" gate is needed: untouchedSince already implies
    // created_date is at least a window old, since updated_date is never
    // earlier than created_date. So a habit younger than the window can never
    // be flagged for a rate covering days before it existed.
    return candidates
        .filter(
            ({ habit, completionRate }) =>
                !habit.archived &&
                completionRate < STRUGGLING_HABIT_RATE &&
                untouchedSince(habit, before)
        )
        .map(({ habit }) => habit);
};

/**
 * Active subtasks under a closed parent, not looked at since the parent closed.
 *
 * Needs no window: "I have looked at this since its parent closed" is the whole
 * rule, and `parent.closed_date` supplies the boundary.
 */
export const orphanedSubtasks = (tasks: TaskRead[], closedTasks: TaskRead[]): TaskRead[] => {
    const closedById = new Map(closedTasks.map((task) => [task.id, task]));
    return tasks.filter((task) => {
        if (task.parent_id == null || !isActive(task)) return false;
        const parentClosedDate = closedById.get(task.parent_id)?.closed_date;
        if (!parentClosedDate) return false;
        return untouchedSince(task, parseServerDate(parentClosedDate));
    });
};
