import { useTimeEntries } from '../api/get-time-entries';
import { useEntryContextName } from '../hooks/use-entry-context-name';
import { TimeLogSection } from './time-log-section';

type ProjectTimeLogProps = {
    profileId: number | null | undefined;
    projectId: number;
};

/**
 * Editable, date-grouped log of every time entry for a project — task-attached
 * (whose task belongs to the project) plus adhoc entries attached directly.
 */
export const ProjectTimeLog = ({ profileId, projectId }: ProjectTimeLogProps) => {
    const entriesQuery = useTimeEntries({ profileId, projectId });
    const contextNameFor = useEntryContextName({ profileId });

    return (
        <TimeLogSection
            className='mt-[30px]'
            title='Time log'
            titleClassName='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'
            summaryClassName='font-mono text-[11px] text-text-faint'
            entriesQuery={entriesQuery}
            contextNameFor={contextNameFor}
            errorMessage='Failed to load time log.'
            errorClassName='font-mono text-[12px] text-danger'
            emptyMessage='No time tracked for this project yet.'
            emptyClassName='font-mono text-[12px] text-text-faint'
        />
    );
};
