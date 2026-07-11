import { useEffect, useState } from 'react';

// How far ahead the schedule looks (includes today). Backend caps at 14.
export const DAY_PRESETS = [
    { days: 1, label: 'Today' },
    { days: 3, label: '3d' },
    { days: 7, label: '1w' },
    { days: 14, label: '2w' }
] as const;
const DEFAULT_WINDOW_DAYS = 7;
const SCHEDULE_DAYS_KEY = 'today_schedule_days';

/**
 * How many days ahead TodaySchedule shows, persisted per browser
 * (localStorage) so the choice survives reloads.
 */
export const useScheduleWindowDays = () => {
    const [windowDays, setWindowDays] = useState(DEFAULT_WINDOW_DAYS);

    useEffect(() => {
        const stored = Number(localStorage.getItem(SCHEDULE_DAYS_KEY));
        if (DAY_PRESETS.some((preset) => preset.days === stored)) setWindowDays(stored);
    }, []);

    const changeWindow = (days: number) => {
        setWindowDays(days);
        localStorage.setItem(SCHEDULE_DAYS_KEY, String(days));
    };

    return { windowDays, changeWindow };
};
