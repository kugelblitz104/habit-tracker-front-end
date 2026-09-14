import { ApiError, JournalService, type JournalEntryRead } from '@/api';
import type { ApiRequestOptions } from '@/api/core/ApiRequestOptions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJournalEntry } from './get-journal-entry';

const apiError = (status: number) =>
    new ApiError(
        {} as ApiRequestOptions,
        { url: '/journal/2026-09-14', ok: false, status, statusText: 'Error', body: null },
        'Request failed'
    );

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getJournalEntry', () => {
    it('returns the entry on a normal 200', async () => {
        const entry = { entry_date: '2026-09-14', profile_id: 1 } as JournalEntryRead;
        vi.spyOn(JournalService, 'readJournalEntryJournalEntryDateGet').mockResolvedValue(entry);

        expect(await getJournalEntry(1, '2026-09-14')).toBe(entry);
    });

    it('resolves to null on a 404, the signal for an unwritten day', async () => {
        vi.spyOn(JournalService, 'readJournalEntryJournalEntryDateGet').mockRejectedValue(
            apiError(404)
        );

        expect(await getJournalEntry(1, '2026-09-14')).toBeNull();
    });

    it('rethrows any other error instead of swallowing it', async () => {
        vi.spyOn(JournalService, 'readJournalEntryJournalEntryDateGet').mockRejectedValue(
            apiError(500)
        );

        await expect(getJournalEntry(1, '2026-09-14')).rejects.toThrow();
    });
});
