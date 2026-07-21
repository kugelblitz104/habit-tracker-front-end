import { useCallback, useEffect, useState } from 'react';

/** How far ahead the Today countdown section looks. `null` = no limit. */
export const COUNTDOWN_RANGE_PRESETS: { days: number | null; label: string }[] = [
    { days: 30, label: '1m' },
    { days: 90, label: '3m' },
    { days: 365, label: '1y' },
    { days: null, label: 'All' }
];

const STORAGE_KEY = 'countdown_window_days';
const DEFAULT_DAYS: number | null = 90;

/**
 * The Today countdown section's look-ahead window, persisted per browser
 * (mirrors the schedule's day-window control). `null` means "show everything".
 */
export const useCountdownWindow = () => {
    const [windowDays, setWindowDays] = useState<number | null>(DEFAULT_DAYS);

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === 'all') setWindowDays(null);
        else if (raw != null && /^\d+$/.test(raw)) setWindowDays(Number(raw));
    }, []);

    const changeWindow = useCallback((days: number | null) => {
        setWindowDays(days);
        try {
            localStorage.setItem(STORAGE_KEY, days == null ? 'all' : String(days));
        } catch {
            /* ignore persistence failures */
        }
    }, []);

    return { windowDays, changeWindow };
};
