/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Computed statistics for a single habit.
 *
 * All values are derived from the habit's trackers on the fly - nothing here
 * is persisted. Mirrors the frontend's client-side computation so the two
 * agree.
 */
export type HabitKPIs = {
    /**
     * Count of trackers with status COMPLETED
     */
    total_completions: number;
    /**
     * Length of the ongoing streak (0 unless it includes today)
     */
    current_streak: number;
    /**
     * Length of the longest streak on record
     */
    longest_streak: number;
    /**
     * End date of the longest streak (for a 'days · Mon' sublabel); None if there is no streak
     */
    longest_streak_end_date?: (string | null);
    /**
     * Completion rate (0.0-1.0) over the trailing 30 days
     */
    thirty_day_completion_rate: number;
    /**
     * Completion rate (0.0-1.0) since the habit's effective start date
     */
    overall_completion_rate: number;
    /**
     * Date of the most recent completion, or None
     */
    last_completed_date?: (string | null);
    /**
     * Length-7 list of completion rates (0.0-1.0), one per weekday, indexed by Python date.weekday(): index 0 = Monday ... 6 = Sunday. The frontend reorders these for display.
     */
    weekday_completion_rates: Array<number>;
};

