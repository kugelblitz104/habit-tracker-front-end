import { JournalService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateJournal } from './query-keys';

export type DeleteJournalEntryInput = {
    /** The day, `YYYY-MM-DD`. */
    date: string;
    profileId: number;
};

/** Delete one day's journal entry. This cannot be undone. */
export const deleteJournalEntry = async ({
    date,
    profileId
}: DeleteJournalEntryInput): Promise<void> =>
    JournalService.deleteJournalEntryJournalEntryDateDelete(date, profileId);

export const useDeleteJournalEntry = defineMutationHook(deleteJournalEntry, (queryClient) => {
    invalidateJournal(queryClient);
});
