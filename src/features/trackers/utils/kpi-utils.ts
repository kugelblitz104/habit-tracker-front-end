import type { HabitRead, TrackerLite, TrackerRead } from '@/api';
import { parseLocalDate } from '@/lib/date-utils';
import { type Streak, TrackerStatus } from '@/types/types';
import { isAutoSkipped, toLocalDateString } from './tracker-utils';

/**
 * Client-side KPI compute result. Deliberately NOT the generated `HabitKPIs`
 * (the server contract in `@/api`): rates here are ×100 percentages, there are
 * no weekday rates, and it carries the habit `id`. `kpi-adapter.ts` converts
 * this into the server shape when patching query caches.
 */
type ClientHabitKPIs = {
    id: number;
    current_streak: number | null;
    longest_streak: number | null;
    total_completions: number;
    thirty_day_completion_rate: number;
    overall_completion_rate: number;
    last_completed_date?: string | null;
};

/**
 * Get the effective start date for KPI calculations.
 * Returns the earlier of the habit's created date or the first tracker date.
 */
export const getEffectiveStartDate = (
    trackers: (TrackerRead | TrackerLite)[],
    createdDate: string
): string => {
    const trackerDates = trackers
        .filter(
            (t) =>
                t.dated &&
                (t.status === TrackerStatus.COMPLETED || t.status === TrackerStatus.SKIPPED)
        )
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
    trackers: (TrackerRead | TrackerLite)[],
    frequency: number,
    range: number,
    createdDate: string
): Streak[] => {
    const todayStr = toLocalDateString(new Date());
    const startDateStr = getEffectiveStartDate(trackers, createdDate);
    const startDate = parseLocalDate(startDateStr);

    const completedDates = new Set(
        trackers
            .filter((t) => t.status === TrackerStatus.COMPLETED && t.dated)
            .map((t) => t.dated as string)
    );
    const skippedDates = new Set(
        trackers
            .filter((t) => t.status === TrackerStatus.SKIPPED && t.dated)
            .map((t) => t.dated as string)
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
export const getCurrentStreakLength = (streaks: Streak[]): number => {
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
 * Calculate the completion rate for a given period, mirroring the backend's
 * `habit_stats._completion_rate` exactly (see `services/habit_stats.py`).
 *
 * If `days` is provided, the window is `[today - (days - 1), today]` — `days`
 * calendar days inclusive of both ends (so `days=30` covers exactly 30 days,
 * not 31). Otherwise the window starts at the habit's effective start date.
 * The habit start date is never used to clamp a `days`-based window, matching
 * the backend, which passes its windowed start straight through.
 *
 * Only `TrackerStatus.COMPLETED` days count toward the numerator — a skipped
 * or auto-skipped day is not a completion here. The denominator scales by
 * `frequency / range` (`window_days * frequency / range`) rather than the raw
 * day count, and the result is capped at 100%, so an "N per M days" habit that
 * hits its target reads as fully complete.
 *
 * Returns a 0–100 percentage (the frontend's contract), not the backend's
 * 0.0–1.0 fraction.
 */
export const calculateCompletionRate = (
    trackers: (TrackerRead | TrackerLite)[],
    frequency: number,
    range: number,
    createdDate: string,
    days?: number
): number => {
    const today = new Date();
    const todayStr = toLocalDateString(today);
    const habitStartStr = getEffectiveStartDate(trackers, createdDate);

    let startDate: Date;
    if (days !== undefined) {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - (days - 1));
    } else {
        startDate = parseLocalDate(habitStartStr);
    }

    // Build a set of completed dates for quick lookup
    const completedDates = new Set(
        trackers
            .filter((t) => t.status === TrackerStatus.COMPLETED && t.dated)
            .map((t) => t.dated as string)
    );

    // Count actual completions and window days by iterating through dates.
    let actual = 0;
    let windowDays = 0;
    let currentDate = new Date(startDate);

    while (toLocalDateString(currentDate) <= todayStr) {
        windowDays++;
        if (completedDates.has(toLocalDateString(currentDate))) {
            actual++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (windowDays <= 0) return 0;

    const expected = (windowDays * frequency) / range;
    if (expected <= 0) return 0;

    return Math.min(1, actual / expected) * 100;
};

/**
 * Get the last completed date from trackers
 */
const getLastCompletedDate = (trackers: (TrackerRead | TrackerLite)[]): string | null => {
    const completedDates = trackers
        .filter((t) => t.status === TrackerStatus.COMPLETED && typeof t.dated === 'string')
        .map((t) => t.dated as string)
        .sort((a, b) => b.localeCompare(a));

    return completedDates[0] ?? null;
};

/**
 * Calculate all KPIs from trackers data
 */
export const calculateKPIsFromTrackers = (
    habit: HabitRead,
    trackers: (TrackerRead | TrackerLite)[]
): ClientHabitKPIs => {
    const totalCompletions = trackers.filter((t) => t.status === TrackerStatus.COMPLETED).length;
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
