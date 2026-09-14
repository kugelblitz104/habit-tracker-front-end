import { TimeEntriesService, type TimeEntryRead } from '@/api';
import { localDayUtcBounds } from '@/lib/date-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDayTimeEntries } from './get-day-time-entries';

const entry = (id: number) => ({ id }) as TimeEntryRead;

const mockList = (total: number) =>
    vi.spyOn(TimeEntriesService, 'listTimeEntriesTimeEntriesGet').mockImplementation((async (
        ..._args: unknown[]
    ) => ({
        time_entries: Array.from({ length: Math.min(100, total) }, (_, i) => entry(i + 1)),
        total
    })) as never);

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getDayTimeEntries', () => {
    it('sends the local day as naive UTC start bounds', async () => {
        const spy = mockList(1);
        const { from, to } = localDayUtcBounds('2026-09-14');

        await getDayTimeEntries(7, '2026-09-14');

        // Positions 7 and 8, after limit and offset: the generated client
        // passes positionally, so an off-by-one silently filters on `running`.
        const call = spy.mock.calls[0]!;
        expect(call[7]).toBe(from);
        expect(call[8]).toBe(to);
        expect(call[7]).not.toMatch(/Z$/);
    });

    it('walks every page, so a heavy day is not truncated at 100', async () => {
        const spy = mockList(150);

        const entries = await getDayTimeEntries(7, '2026-09-14');

        expect(spy).toHaveBeenCalledTimes(2);
        expect(new Set(entries.map((row) => row.id)).size).toBe(entries.length);
    });
});
