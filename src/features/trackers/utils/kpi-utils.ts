import type { HabitKPIs, HabitRead, TrackerRead } from '@/api';
import { parseLocalDate } from '@/lib/date-utils';
import type { Streak } from '@/types/types';
import { isAutoSkipped, toLocalDateString } from './tracker-utils';

/**
 * Get the effective start date for KPI calculations.
 * Returns the earlier of the habit's created date or the first tracker date.
 */
const getEffectiveStartDate = (trackers: TrackerRead[], createdDate: string): string => {
    const trackerDates = trackers
        .filter((t) => t.dated && (t.completed || t.skipped))
        .map((t) => t.dated as string)
        .sort((a, b) => a.localeCompare(b));
    const firstTrackerDate = trackerDates[0];

    // Extract just the date part from createdDate (YYYY-MM-DD)
    const createdDateOnly = createdDate.split('T')[0] ?? createdDate;

    return firstTrackerDate && firstTrackerDate < createdDateOnly
        ? firstTrackerDate
        : createdDateOnly;
};

/**
 * Calculate all streaks based on trackers and habit settings.
 * A streak continues if the user meets their frequency goal within each range window.
 * Returns an array of streak objects sorted by start date (oldest first).
 */
export const calculateStreaks = (
    trackers: TrackerRead[],
    frequency: number,
    range: number,
    createdDate: string
): Streak[] => {
    const todayStr = toLocalDateString(new Date());
    const startDateStr = getEffectiveStartDate(trackers, createdDate);
    const startDate = parseLocalDate(startDateStr);

    const completedDates = new Set(
        trackers.filter((t) => t.completed && t.dated).map((t) => t.dated as string)
    );
    const skippedDates = new Set(
        trackers.filter((t) => t.skipped && t.dated).map((t) => t.dated as string)
    );

    const streaks: Streak[] = [];
    let currentStreak: Streak | null = null;
    let currentDate = new Date(startDate);

    while (toLocalDateString(currentDate) <= todayStr) {
        const dateStr = toLocalDateString(currentDate);
        let continuesStreak = false;

        // Check if this date has a completion or skip
        if (completedDates.has(dateStr) || skippedDates.has(dateStr)) {
            continuesStreak = true;
        } else {
            // Check if auto-skip applies (met frequency goal in the range window)
            continuesStreak = isAutoSkipped(currentDate, trackers, frequency, range);
        }

        if (continuesStreak) {
            if (currentStreak) {
                // Extend current streak
                currentStreak.endDate = dateStr;
                currentStreak.length++;
            } else {
                // Start new streak
                currentStreak = {
                    startDate: dateStr,
                    endDate: dateStr,
                    length: 1
                };
            }
        } else {
            // Streak broken
            if (currentStreak) {
                streaks.push(currentStreak);
                currentStreak = null;
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Don't forget to add the last streak if it's ongoing
    if (currentStreak) {
        streaks.push(currentStreak);
    }

    return streaks;
};

/**
 * Get current streak length from streaks array.
 * Current streak is the last streak if it includes today.
 */
const getCurrentStreakLength = (streaks: Streak[]): number => {
    const lastStreak = streaks.at(-1);
    if (!lastStreak) return 0;

    const todayStr = toLocalDateString(new Date());

    // Current streak must end today
    if (lastStreak.endDate === todayStr) {
        return lastStreak.length;
    }

    return 0;
};

/**
 * Get longest streak length from streaks array.
 */
const getLongestStreakLength = (streaks: Streak[]): number => {
    if (streaks.length === 0) return 0;
    return Math.max(...streaks.map((s) => s.length));
};

/**
 * Calculate the completion rate for a given period.
 * If `days` is provided, calculates the rate for that many days back from today.
 * Otherwise, calculates the overall rate since habit creation.
 * Auto-skipped dates count as completions.
 */
const calculateCompletionRate = (
    trackers: TrackerRead[],
    frequency: number,
    range: number,
    createdDate: string,
    days?: number
): number => {
    const today = new Date();
    const todayStr = toLocalDateString(today);
    const habitStartStr = getEffectiveStartDate(trackers, createdDate);
    const habitStartDate = parseLocalDate(habitStartStr);

    let startDate: Date;
    if (days !== undefined) {
        const daysAgo = new Date(today);
        daysAgo.setDate(today.getDate() - days);
        // Use the later of habit start date or days ago
        startDate = daysAgo ? daysAgo : habitStartDate;
    } else {
        startDate = habitStartDate;
    }

    // Build a set of completed dates for quick lookup
    const completedDates = new Set(
        trackers.filter((t) => t.completed && t.dated).map((t) => t.dated as string)
    );

    const skippedDates = new Set(
        trackers.filter((t) => t.skipped && t.dated).map((t) => t.dated as string)
    );

    // Count completions and total days by iterating through dates
    let completions = 0;
    let totalDays = 0;
    let currentDate = new Date(startDate);

    while (toLocalDateString(currentDate) <= todayStr) {
        const dateStr = toLocalDateString(currentDate);
        totalDays++;

        if (completedDates.has(dateStr) || skippedDates.has(dateStr)) {
            completions++;
        } else if (isAutoSkipped(currentDate, trackers, frequency, range)) {
            completions++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (totalDays <= 0) return 0;

    return (completions / totalDays) * 100;
};

/**
 * Get the last completed date from trackers
 */
const getLastCompletedDate = (trackers: TrackerRead[]): string | null => {
    const completedDates = trackers
        .filter((t) => t.completed === true && typeof t.dated === 'string')
        .map((t) => t.dated as string)
        .sort((a, b) => b.localeCompare(a));

    return completedDates[0] ?? null;
};

/**
 * Calculate all KPIs from trackers data
 */
export const calculateKPIsFromTrackers = (habit: HabitRead, trackers: TrackerRead[]): HabitKPIs => {
    const totalCompletions = trackers.filter((t) => t.completed).length;
    const streaks = calculateStreaks(trackers, habit.frequency, habit.range, habit.created_date);

    return {
        id: habit.id,
        current_streak: getCurrentStreakLength(streaks),
        longest_streak: getLongestStreakLength(streaks),
        total_completions: totalCompletions,
        thirty_day_completion_rate: calculateCompletionRate(
            trackers,
            habit.frequency,
            habit.range,
            habit.created_date,
            30
        ),
        overall_completion_rate: calculateCompletionRate(
            trackers,
            habit.frequency,
            habit.range,
            habit.created_date
        ),
        last_completed_date: getLastCompletedDate(trackers)
    };
};
