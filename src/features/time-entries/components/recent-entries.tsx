import { Button } from '@/components/ui/buttons/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTimeEntries, useTimeEntrySummary } from '../api/get-time-entries';
import { useEntryContextName } from '../hooks/use-entry-context-name';
import { useEntryProject } from '../hooks/use-entry-project';
import { ManualEntryForm } from './manual-entry-form';
import { TimeLogSection } from './time-log-section';

type RecentEntriesProps = {
    profileId: number | null | undefined;
};

/** Recent time entries for the profile — editable, date-grouped, with a total. */
export const RecentEntries = ({ profileId }: RecentEntriesProps) => {
    const entriesQuery = useTimeEntries({ profileId, maxRows: 50 });
    const summaryQuery = useTimeEntrySummary({ profileId });
    const contextNameFor = useEntryContextName({ profileId, includeProjects: true });
    const projectFor = useEntryProject({ profileId });
    const [addOpen, setAddOpen] = useState(false);

    return (
        <>
            <TimeLogSection
                variant='recent'
                title='Recent entries'
                headerActions={
                    <Button
                        variant='subtle'
                        size='sm'
                        onClick={() => setAddOpen(true)}
                        aria-label='Add time entry'
                        title='Add entry'
                        className='border min-w-[28px] pointer-coarse:min-w-[44px]'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <Plus size={14} />
                    </Button>
                }
                entriesQuery={entriesQuery}
                totalSeconds={summaryQuery.data?.total_seconds ?? 0}
                contextNameFor={contextNameFor}
                projectFor={projectFor}
                showProject
                errorMessage='Failed to load time entries.'
                emptyMessage='No time tracked yet. Start a timer above.'
            />
            <ManualEntryForm
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                profileId={profileId}
            />
        </>
    );
};
