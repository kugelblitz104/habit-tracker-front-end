import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { invalidateJournal, journalKeys } from './query-keys';

describe('journalKeys', () => {
    it('day key carries both profileId and date', () => {
        expect(journalKeys.day(1, '2026-09-14')).toEqual([
            'journal-day',
            { profileId: 1, date: '2026-09-14' }
        ]);
    });

    it('day key differs across dates for the same profile', () => {
        expect(journalKeys.day(1, '2026-09-14')).not.toEqual(journalKeys.day(1, '2026-09-15'));
    });

    it('day key differs across profiles for the same date', () => {
        expect(journalKeys.day(1, '2026-09-14')).not.toEqual(journalKeys.day(2, '2026-09-14'));
    });

    it('list key carries profileId and the date range', () => {
        expect(journalKeys.list(1, '2026-09-01', '2026-09-30')).toEqual([
            'journal-list',
            { profileId: 1, fromDate: '2026-09-01', toDate: '2026-09-30' }
        ]);
    });
});

describe('invalidateJournal', () => {
    it('invalidates both the day and list prefixes', () => {
        const queryClient = new QueryClient();
        const spy = vi.spyOn(queryClient, 'invalidateQueries');

        invalidateJournal(queryClient);

        expect(spy).toHaveBeenCalledWith({ queryKey: ['journal-day'] });
        expect(spy).toHaveBeenCalledWith({ queryKey: ['journal-list'] });
    });
});
