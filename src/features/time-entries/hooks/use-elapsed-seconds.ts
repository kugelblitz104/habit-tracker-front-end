import { parseServerDate } from '@/lib/date-utils';
import { useEffect, useState } from 'react';

/**
 * Live elapsed seconds since `startedAt` (a server timestamp), recomputed from
 * the wall clock on every tick rather than kept as an incrementing counter — so
 * it stays accurate across tab backgrounding, throttled timers and navigation.
 * Returns 0 when inactive or unset.
 *
 * @param startedAt server datetime string (parsed as UTC via parseServerDate)
 * @param active whether a timer is currently running
 */
export const useElapsedSeconds = (
    startedAt: string | null | undefined,
    active: boolean
): number => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!active || !startedAt) return;
        // Resync immediately (mount / dependency change), then tick each second.
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [active, startedAt]);

    if (!startedAt || !active) return 0;
    const started = parseServerDate(startedAt).getTime();
    return Math.max(0, Math.floor((now - started) / 1000));
};
