import type { HabitKPIs, HabitStreak, HabitRead, TrackerLite, TrackerRead } from '@/api';
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { type Streak, TrackerStatus } from '@/types/types';
import {
    calculateKPIsFromTrackers,
    calculateStreaks,
    getEffectiveStartDate
} from './kpi-utils';

/**
 * Bridge between the client-side KPI/streak compute (which uses ×100 percentages
 * and camelCase `{startDate,endDate,length}`) and the SERVER response shape
 * (snake_case, fractions 0.0–1.0, Python-weekday ordered rates).
 *
 * Used to optimistically patch the `['kpis']` / `['streaks']` query caches when
 * a tracker is backdated on the detail page so the UI stays instant; the server
 * later reconciles the truth via invalidation.
 */

/**
 * Completion rate (0.0–1.0) for each weekday, indexed by Python `date.weekday()`
 * (0 = Monday … 6 = Sunday) to match the backend's `weekday_completion_rates`.
 * Only days actually marked COMPLETED count — skipped and auto-skipped days do
 * not — and the rate is `min(1, completed / expected)` where expected spreads
 * the habit's goal evenly (`dayCount * frequency / range`), exactly as the
 * server computes it (`_weekday_completion_rates`).
 */
const computeWeekdayCompletionRates = (
    habit: HabitRead,
    trackers: (TrackerRead | TrackerLite)[]
): number[] => {
    const todayStr = toLocalDateString(new Date());
    const startStr = getEffectiveStartDate(trackers, habit.created_date);
    const startDate = parseLocalDate(startStr);

    const completedDates = new Set(
        trackers
            .filter((t) => t.status === TrackerStatus.COMPLETED && t.dated)
            .map((t) => t.dated as string)
    );

    const totals = new Array(7).fill(0);
    const completions = new Array(7).fill(0);

    const current = new Date(startDate);
    while (toLocalDateString(current) <= todayStr) {
        const dateStr = toLocalDateString(current);
        // JS getDay(): 0 = Sunday … 6 = Saturday → Python weekday: 0 = Monday … 6 = Sunday
        const pyWeekday = (current.getDay() + 6) % 7;
        totals[pyWeekday]++;

        if (completedDates.has(dateStr)) {
            completions[pyWeekday]++;
        }

        current.setDate(current.getDate() + 1);
    }

    return totals.map((total, i) => {
        const expected = (total * habit.frequency) / habit.range;
        return expected > 0 ? Math.min(1, completions[i] / expected) : 0;
    });
};

/**
 * Map the client-side KPI compute into the generated `HabitKPIs` (server) shape:
 * rates divided by 100 into fractions, snake_case fields, plus the extra
 * `longest_streak_end_date` and `weekday_completion_rates` the server provides.
 */
export const adaptKpisToServerShape = (
    habit: HabitRead,
    trackers: (TrackerRead | TrackerLite)[]
): HabitKPIs => {
    const localKpis = calculateKPIsFromTrackers(habit, trackers);
    const streaks = calculateStreaks(trackers, habit.frequency, habit.range, habit.created_date);
    const longest = streaks.reduce<Streak | null>(
        (max, s) => (!max || s.length > max.length ? s : max),
        null
    );

    return {
        total_completions: localKpis.total_completions,
        current_streak: localKpis.current_streak ?? 0,
        longest_streak: localKpis.longest_streak ?? 0,
        longest_streak_end_date: longest ? longest.endDate : null,
        thirty_day_completion_rate: localKpis.thirty_day_completion_rate / 100,
        overall_completion_rate: localKpis.overall_completion_rate / 100,
        last_completed_date: localKpis.last_completed_date ?? null,
        weekday_completion_rates: computeWeekdayCompletionRates(habit, trackers)
    };
};

/**
 * Map the client-side streak compute into the generated `HabitStreak[]` (server)
 * shape: camelCase `{startDate,endDate,length}` → snake_case `{start_date,end_date,length}`.
 * Returned oldest-first, matching the server.
 */
export const adaptStreaksToServerShape = (
    habit: HabitRead,
    trackers: (TrackerRead | TrackerLite)[]
): HabitStreak[] => {
    return calculateStreaks(trackers, habit.frequency, habit.range, habit.created_date).map(
        (s) => ({
            start_date: s.startDate,
            end_date: s.endDate,
            length: s.length
        })
    );
};
