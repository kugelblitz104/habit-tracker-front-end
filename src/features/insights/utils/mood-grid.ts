import { parseLocalDate, shiftDay } from '@/lib/date-utils';

/**
 * Week columns for a calendar heatmap ending on `today`, oldest first.
 * Each column holds 7 `YYYY-MM-DD` days starting on the profile's week start;
 * days after `today` are null so the last column can be partial.
 */
export const buildMoodWeeks = (
    today: string,
    weeks: number,
    weekStartMonday: boolean
): (string | null)[][] => {
    const weekday = parseLocalDate(today).getDay();
    const offset = weekStartMonday ? (weekday + 6) % 7 : weekday;
    const firstDay = shiftDay(today, -offset - (weeks - 1) * 7);

    return Array.from({ length: weeks }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => {
            const day = shiftDay(firstDay, w * 7 + d);
            return day > today ? null : day;
        })
    );
};
