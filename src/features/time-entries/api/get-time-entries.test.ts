import { TimeEntriesService, type TimeEntryRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTimeEntries, getTimeEntriesQueryOptions } from './get-time-entries';

const entry = (id: number) => ({ id, duration_seconds: 60 }) as TimeEntryRead;

const stubPages = (total: number) =>
    vi.spyOn(TimeEntriesService, 'listTimeEntriesTimeEntriesGet').mockImplementation((async (
        ..._args: unknown[]
    ) => {
        const limit = _args[5] as number;
        const offset = (_args[6] as number) ?? 0;
        return {
            time_entries: Array.from(
                { length: Math.max(Math.min(limit, total - offset), 0) },
                (_, i) => entry(offset + i)
            ),
            total,
            limit,
            offset
        };
    }) as never);

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getTimeEntries', () => {
    it('walks every page, so a summed total is the real total', async () => {
        const spy = stubPages(250);

        const result = await getTimeEntries({ profileId: 1, taskId: 7 });

        expect(result.time_entries).toHaveLength(250);
        const summed = (result.time_entries ?? []).reduce(
            (sum, e) => sum + (e.duration_seconds ?? 0),
            0
        );
        expect(summed).toBe(250 * 60);
        expect(spy).toHaveBeenCalledTimes(3);
        // taskId must survive the walk on every request.
        expect(spy.mock.calls.every((call) => call[1] === 7)).toBe(true);
    });

    it('maxRows bounds the read to exactly that many rows', async () => {
        const spy = stubPages(250);

        const result = await getTimeEntries({ profileId: 1, maxRows: 50 });

        expect(result.time_entries).toHaveLength(50);
        expect(spy).toHaveBeenCalledTimes(1);
        // `total` still reports the full count, so a bounded caller can say so.
        expect(result.total).toBe(250);
    });
});

describe('getTimeEntriesQueryOptions', () => {
    it('keys different maxRows separately, so two consumers do not share one query', () => {
        const labelInput = getTimeEntriesQueryOptions({ profileId: 1, maxRows: 100 });
        const recentEntries = getTimeEntriesQueryOptions({ profileId: 1, maxRows: 50 });

        expect(labelInput.queryKey).not.toEqual(recentEntries.queryKey);
    });
});
