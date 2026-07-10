import { useTimeEntries } from '../api/get-time-entries';
import { formatHumanDuration } from '../utils/format-duration';
import { EditableTimeLog } from './editable-time-log';

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
        <section>
            <div className='mb-2 flex items-center justify-between'>
                <h3 className='font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'>
                    Time log
                </h3>
                <span className='font-mono text-[11px] text-text-faint'>
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·{' '}
                    {formatHumanDuration(totalSeconds)}
                </span>
            </div>

            {entriesQuery.isError && (
                <p className='font-mono text-[11.5px] text-danger'>Failed to load time log.</p>
            )}

            {!entriesQuery.isError && entries.length === 0 && (
                <p className='font-mono text-[11.5px] text-text-faint'>
                    No time tracked for this task yet.
                </p>
            )}

            {entries.length > 0 && <EditableTimeLog entries={entries} />}
        </section>
    );
};
