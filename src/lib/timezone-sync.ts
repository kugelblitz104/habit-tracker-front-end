/**
 * True when the profile's stored timezone should be replaced by the browser's.
 * Notification times are computed server-side in the profile timezone, so it
 * has to follow the device. An empty or "Etc/Unknown" browser zone (reported by
 * some Windows Chrome builds, and rejected by the server) never overwrites anything.
 */
export const shouldSyncTimezone = (
    profileTimezone: string | null | undefined,
    browserTimezone: string | null | undefined
): boolean =>
    Boolean(browserTimezone) &&
    browserTimezone !== 'Etc/Unknown' &&
    profileTimezone !== browserTimezone;

/**
 * Whether a failed sync may be retried. A 4xx is a rejection that repeating
 * cannot fix; a network error (no status) or 5xx may be transient.
 */
export const shouldRetryTimezoneSync = (status: number | undefined): boolean =>
    status === undefined || status >= 500;
