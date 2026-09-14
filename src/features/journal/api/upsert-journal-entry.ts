import type { JournalEntryCreate, JournalEntryRead } from '@/api';
import { JournalService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateJournal } from './query-keys';

export type UpsertJournalEntryInput = {
    /** The day, `YYYY-MM-DD`. Authoritative: any `entry_date` elsewhere is ignored. */
    date: string;
    data: JournalEntryCreate;
};

/**
 * Create or update one day's journal entry. `PUT` replaces the whole day, so
 * an omitted field in `data` clears that field rather than leaving it alone.
 * Returns 201 on create, 200 on update; the body shape is the same either way.
 */
export const upsertJournalEntry = async ({
    date,
    data
}: UpsertJournalEntryInput): Promise<JournalEntryRead> =>
    JournalService.upsertJournalEntryJournalEntryDatePut(date, data);

export const useUpsertJournalEntry = defineMutationHook(upsertJournalEntry, (queryClient) => {
    invalidateJournal(queryClient);
});
