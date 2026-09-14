import { TrackersService, type TrackerRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDayTrackers } from './get-day-trackers';

const tracker = (id: number) => ({ id, habit_id: 1, status: 2 }) as TrackerRead;

const mockList = (total: number) =>
    vi.spyOn(TrackersService, 'listTrackersTrackersGet').mockImplementation((async (
        ..._args: unknown[]
    ) => ({
        trackers: Array.from({ length: Math.min(100, total) }, (_, i) => tracker(i + 1)),
        total
    })) as never);

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getDayTrackers', () => {
    it('sends plain local dates, not UTC instants', async () => {
        const spy = mockList(1);

        await getDayTrackers(7, '2026-08-16', '2026-09-14');

        // A tracker's `dated` is a date column, so shifting it into UTC the
        // way tasks and time entries are shifted would file evening entries
        // on the wrong day.
        const call = spy.mock.calls[0]!;
        expect(call[0]).toBe(7);
        expect(call[1]).toBe('2026-08-16');
        expect(call[2]).toBe('2026-09-14');
    });

    it('walks every page, so a long lookback is not truncated', async () => {
        const spy = mockList(150);

        const rows = await getDayTrackers(7, '2026-08-16', '2026-09-14');

        expect(spy).toHaveBeenCalledTimes(2);
        expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    });
});
