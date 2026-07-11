import type { CalendarEventRead } from '@/api';

export type UpcomingDay = { date: string; events: CalendarEventRead[] };

export type GroupedUpcomingEvents = {
    days: UpcomingDay[];
    /** Count of events beyond the cap, not included in `days`. */
    hiddenCount: number;
};

/**
 * Groups upcoming (post-today) events by day and caps the total number of
 * rows shown, truncating mid-day if needed. Assumes the caller's events are
 * already ordered by event_date (all-day first within each day), so
 * contiguous runs form complete day groups.
 */
export const groupUpcomingEvents = (
    events: CalendarEventRead[],
    cap: number
): GroupedUpcomingEvents => {
    const days: UpcomingDay[] = [];
    for (const event of events) {
        const lastDay = days[days.length - 1];
        if (lastDay && lastDay.date === event.event_date) lastDay.events.push(event);
        else days.push({ date: event.event_date, events: [event] });
    }

    let budget = cap;
    const visibleDays: UpcomingDay[] = [];
    for (const day of days) {
        if (budget <= 0) break;
        visibleDays.push({ date: day.date, events: day.events.slice(0, budget) });
        budget -= day.events.length;
    }
    const hiddenCount =
        events.length - visibleDays.reduce((count, day) => count + day.events.length, 0);

    return { days: visibleDays, hiddenCount };
};
