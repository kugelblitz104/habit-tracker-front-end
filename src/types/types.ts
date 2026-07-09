export type Meta = {
    page: number;
    total: number;
    total_pages: number;
};

/**
 * Tracker status constants
 * 0 = not completed
 * 1 = skipped
 * 2 = completed
 */
export enum TrackerStatus {
    NOT_COMPLETED = 0,
    SKIPPED = 1,
    COMPLETED = 2
}

export enum DisplayStatus {
    NOT_COMPLETED = 'not_completed',
    COMPLETED = 'completed',
    SKIPPED = 'skipped',
    AUTO_SKIPPED = 'auto_skipped'
}

export enum LoadingStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    ERROR = 'error'
}

/**
 * Task status constants — mirrors backend `TaskStatus(int, Enum)` in constants.py.
 * Stored on `task.status`; drives the round status control glyph, the meta pill,
 * and whether a task appears in an active band or in "Completed & closed".
 */
export enum TaskStatus {
    OPEN = 0,
    IN_PROGRESS = 1,
    SCHEDULED = 2,
    BLOCKED = 3,
    NEEDS_INFO = 4,
    DEFERRED = 5,
    DONE = 6,
    CANCELLED = 7
}

/**
 * Computed urgency band — mirrors backend `compute_band`. Delivered already
 * resolved on `TaskRead.band`; the UI never sets or changes a band.
 * `hidden` = done/cancelled (appears in "Completed & closed").
 */
export type TaskBand = 'now' | 'soon' | 'whenever' | 'hidden';

/** Priority scale for tasks: 0 none / 1 low / 2 medium / 3 high. */
export enum TaskPriority {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3
}

/** Ordered active bands used for client-side grouping on the Today surface. */
export const ACTIVE_TASK_BANDS: Exclude<TaskBand, 'hidden'>[] = ['now', 'soon', 'whenever'];

export type Frequency = {
    name: string;
    frequency: number;
    range: number;
};

export type Streak = {
    startDate: string;
    endDate: string;
    length: number;
};

export type DropdownOption = {
    field: string;
    label: string;
};

export type SortDirection = 'asc' | 'desc';

export type HabitKPIs = {
    id: number;
    current_streak: number | null;
    longest_streak: number | null;
    total_completions: number;
    thirty_day_completion_rate: number;
    overall_completion_rate: number;
    last_completed_date?: string | null;
};
