import { describe, expect, it } from 'vitest';
import { shouldRetryTimezoneSync, shouldSyncTimezone } from './timezone-sync';

describe('shouldSyncTimezone', () => {
    it('syncs when the profile has no timezone', () => {
        expect(shouldSyncTimezone(null, 'Europe/Berlin')).toBe(true);
        expect(shouldSyncTimezone(undefined, 'Europe/Berlin')).toBe(true);
    });
    it('syncs when the zones differ', () => {
        expect(shouldSyncTimezone('America/New_York', 'Europe/Berlin')).toBe(true);
    });
    it('does nothing when they match', () => {
        expect(shouldSyncTimezone('Europe/Berlin', 'Europe/Berlin')).toBe(false);
    });
    it('never writes an empty browser zone', () => {
        expect(shouldSyncTimezone('Europe/Berlin', '')).toBe(false);
        expect(shouldSyncTimezone(null, undefined)).toBe(false);
    });
    it('never writes Etc/Unknown', () => {
        expect(shouldSyncTimezone('Europe/Berlin', 'Etc/Unknown')).toBe(false);
        expect(shouldSyncTimezone(null, 'Etc/Unknown')).toBe(false);
    });
});

describe('shouldRetryTimezoneSync', () => {
    it('retries network errors and 5xx', () => {
        expect(shouldRetryTimezoneSync(undefined)).toBe(true);
        expect(shouldRetryTimezoneSync(500)).toBe(true);
        expect(shouldRetryTimezoneSync(503)).toBe(true);
    });
    it('does not retry a 4xx', () => {
        expect(shouldRetryTimezoneSync(400)).toBe(false);
        expect(shouldRetryTimezoneSync(422)).toBe(false);
    });
});
