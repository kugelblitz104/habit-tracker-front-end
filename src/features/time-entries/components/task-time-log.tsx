import { useTimeEntries } from '../api/get-time-entries';
import { formatHumanDuration } from '../utils/format-duration';
import { TimeLogSection } from './time-log-section';

type TaskTimeLogProps = {
    profileId: number | null | undefined;
    taskId: number;
};

/**
 * Editable, date-grouped log of a task's time entries. Shown in the read-only
 * task VIEW (deliberately not in the plain edit form).
 */
export const TaskTimeLog = ({ profileId, taskId }: TaskTimeLogProps) => {
    const entriesQuery = useTimeEntries({ profileId, taskId });
    const entries = entriesQuery.data?.time_entries ?? [];
    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0);

    return (
        <TimeLogSection
            title='Time log'
            titleAs='h3'
            titleClassName='font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'
            headerClassName='mb-2 flex items-center justify-between'
            summary={`${entries.length} ${
                entries.length === 1 ? 'entry' : 'entries'
            } · ${formatHumanDuration(totalSeconds)}`}
            summaryClassName='font-mono text-[11px] text-text-faint'
            entriesQuery={entriesQuery}
            errorMessage='Failed to load time log.'
            errorClassName='font-mono text-[11.5px] text-danger'
            emptyMessage='No time tracked for this task yet.'
            emptyClassName='font-mono text-[11.5px] text-text-faint'
            card={false}
        />
    );
};
