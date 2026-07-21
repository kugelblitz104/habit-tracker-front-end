import { useEffect, useState } from 'react';

/**
 * A `Date` that refreshes on an interval (default every minute), so countdowns
 * and other time-relative UI stay live without a manual reload. The interval is
 * client-only (set in an effect); SSR/first render uses the initial timestamp.
 */
export const useNow = (intervalMs = 60_000): Date => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
};
