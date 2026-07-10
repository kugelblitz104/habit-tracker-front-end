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

/** Ordered active bands used for client-side grouping on the Today surface. */
export const ACTIVE_TASK_BANDS: Exclude<TaskBand, 'hidden'>[] = ['now', 'soon', 'whenever'];

/**
 * Time-entry kind — mirrors backend `TimeEntryKind(int, Enum)` in constants.py.
 * Stored on `time_entry.kind`.
 */
export enum TimeEntryKind {
    STOPWATCH = 0,
    POMODORO = 1
}

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
