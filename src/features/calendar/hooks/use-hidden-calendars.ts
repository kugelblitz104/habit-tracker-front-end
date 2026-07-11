import { useEffect, useState } from 'react';

/**
 * View-side calendar visibility for TodaySchedule: the legend acts as
 * checkboxes so a shared calendar (e.g. a partner's) can be hidden from this
 * view without touching its Settings on/off state. Persisted per profile.
 */
export const useHiddenCalendars = (profileId: number | null | undefined) => {
    const storageKey = profileId ? `today_schedule_hidden_calendars_${profileId}` : null;
    const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!storageKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            setHiddenIds(raw ? new Set<number>(JSON.parse(raw)) : new Set());
        } catch {
            setHiddenIds(new Set());
        }
    }, [storageKey]);

    const toggleHidden = (id: number) => {
        setHiddenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...next]));
            return next;
        });
    };

    return { hiddenIds, toggleHidden };
};
