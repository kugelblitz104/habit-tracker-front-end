import { useTimeEntries, useTimeEntrySummary } from '../api/get-time-entries';
import { useEntryContextName } from '../hooks/use-entry-context-name';
import { TimeLogSection } from './time-log-section';

type RecentEntriesProps = {
    profileId: number | null | undefined;
};

/** Recent time entries for the profile — editable, date-grouped, with a total. */
export const RecentEntries = ({ profileId }: RecentEntriesProps) => {
    const entriesQuery = useTimeEntries({ profileId, limit: 50 });
    const summaryQuery = useTimeEntrySummary({ profileId });
    const contextNameFor = useEntryContextName({ profileId, includeProjects: true });

    return (
        <TimeLogSection
            className='mt-8'
            title='Recent entries'
            titleClassName='font-mono text-[11.5px] uppercase tracking-[0.16em] text-text-muted'
            headerClassName='mb-3 flex items-center justify-between'
            summaryClassName='font-mono text-[11.5px] text-text-faint'
            entriesQuery={entriesQuery}
            totalSeconds={summaryQuery.data?.total_seconds ?? 0}
            contextNameFor={contextNameFor}
            errorMessage='Failed to load time entries.'
            errorClassName='font-mono text-[12px] text-danger'
            emptyMessage='No time tracked yet. Start a timer above.'
            emptyClassName='font-mono text-[12px] text-text-faint'
        />
    );
};
