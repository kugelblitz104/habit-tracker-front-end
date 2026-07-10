/**
 * Format a number of seconds as a clock readout: `H:MM:SS` once past an hour,
 * `MM:SS` under. Used for the live timer display and per-entry durations.
 */
export const formatClock = (totalSeconds: number): string => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

/**
 * Compact human total, e.g. "1h 25m", "25m", "40s". Used for summaries and
 * per-task totals where a running clock would be noise.
 */
export const formatHumanDuration = (totalSeconds: number): string => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${s}s`;
};
