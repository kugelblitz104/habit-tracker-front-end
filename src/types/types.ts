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
