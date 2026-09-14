import { formatHumanDuration } from '@/features/time-entries/utils/format-duration';
import { useEntryContextName } from '@/features/time-entries/hooks/use-entry-context-name';
import { useEntryProject } from '@/features/time-entries/hooks/use-entry-project';
import { useDayTimeEntries } from '../api/get-day-time-entries';
import { localClockLabel, totalTimeSeconds } from '../utils/day-summary';
import { DayRow, DaySection } from './day-section';

type DayTimeLogProps = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
};

/**
 * Every session tracked on this day, in the order they were started.
 *
 * One row per entry rather than a per-project roll-up: a day holds a handful
 * of sessions, and what they were is more of the day's record than what they
 * totalled. The figure at the top carries the total.
 */
export const DayTimeLog = ({ profileId, date }: DayTimeLogProps) => {
    const query = useDayTimeEntries({ profileId, date });
    const contextNameFor = useEntryContextName({ profileId, includeProjects: true });
    const projectFor = useEntryProject({ profileId });

    // The server orders most recent first; a day reads forwards.
    const entries = [...(query.data ?? [])].sort((a, b) =>
        a.started_at.localeCompare(b.started_at)
    );
    const total = totalTimeSeconds(entries);

    return (
        <DaySection
            title='Time'
            meta={total > 0 ? formatHumanDuration(total) : null}
            isLoading={query.isLoading}
            isError={query.isError}
            isBusy={query.isPlaceholderData}
            errorMessage='Failed to load the time logged on this day.'
            emptyMessage='No time was logged on this day.'
            isEmpty={entries.length === 0}
        >
            {entries.map((entry) => (
                <DayRow
                    key={entry.id}
                    dotColor={projectFor(entry)?.color}
                    // Same naming rule as the timer page's log: the entry's
                    // own label, else whatever it was attached to.
                    title={
                        entry.label?.trim() ||
                        contextNameFor(entry) ||
                        (localClockLabel(entry.started_at) ?? 'Untitled')
                    }
                    trailing={
                        entry.is_running
                            ? 'running'
                            : formatHumanDuration(entry.duration_seconds ?? 0)
                    }
                />
            ))}
        </DaySection>
    );
};
