import type { JournalEntryRead } from '@/api';
import { shiftDay } from '@/lib/date-utils';

type EntryFields = Pick<JournalEntryRead, 'entry_date' | 'body' | 'gratitude' | 'day_quality'>;

/** A saved row with every field cleared is still a row, but nothing was written. */
const isWritten = (entry: EntryFields): boolean =>
    !!(entry.body?.trim() || entry.gratitude?.trim() || entry.day_quality);

/**
 * The first day after the most recent written entry, i.e. the start of the
 * unwritten run that ends today. Null when today is written or no written
 * entry exists on or before today.
 */
export const firstUnwrittenDay = (entries: EntryFields[], today: string): string | null => {
    let latest: string | null = null;
    for (const entry of entries) {
        if (entry.entry_date <= today && isWritten(entry) && (!latest || entry.entry_date > latest))
            latest = entry.entry_date;
    }
    if (!latest) return null;
    const next = shiftDay(latest, 1);
    return next <= today ? next : null;
};
