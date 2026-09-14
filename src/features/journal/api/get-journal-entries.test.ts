import { JournalService, type JournalEntryRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJournalEntries } from './get-journal-entries';

const entry = (n: number) => ({ id: n, entry_date: `2026-01-${n}` }) as unknown as JournalEntryRead;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getJournalEntries', () => {
    it('walks every page so a range view sees every day', async () => {
        const total = 250;
        const spy = vi
            .spyOn(JournalService, 'listJournalEntriesJournalGet')
            .mockImplementation((async (
                _profileId: number,
                _fromDate: string | null,
                _toDate: string | null,
                limit: number,
                offset: number
            ) => ({
                entries: Array.from({ length: Math.min(limit, total - offset) }, (_, i) =>
                    entry(offset + i)
                ),
                total,
                limit,
                offset
            })) as never);

        const result = await getJournalEntries(1, '2026-01-01', '2026-12-31');

        expect(result.entries).toHaveLength(total);
        expect(result.total).toBe(total);
        expect(spy).toHaveBeenCalledTimes(3);
        // The date range must survive the walk, on every request.
        expect(
            spy.mock.calls.every((call) => call[1] === '2026-01-01' && call[2] === '2026-12-31')
        ).toBe(true);
    });

    it('makes one request when everything fits on a page', async () => {
        const spy = vi.spyOn(JournalService, 'listJournalEntriesJournalGet').mockResolvedValue({
            entries: [entry(1)],
            total: 1,
            limit: 100,
            offset: 0
        } as never);

        const result = await getJournalEntries(1);

        expect(result.entries).toHaveLength(1);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
