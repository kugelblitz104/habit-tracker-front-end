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
            variant='project'
            title='Time log'
            entriesQuery={entriesQuery}
            contextNameFor={contextNameFor}
            errorMessage='Failed to load time log.'
            emptyMessage='No time tracked for this project yet.'
        />
    );
};
