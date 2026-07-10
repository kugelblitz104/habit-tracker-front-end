import type { TimeEntryRead } from '@/api';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useMemo } from 'react';
import { useTimeEntries } from '../api/get-time-entries';
import { formatHumanDuration } from '../utils/format-duration';
import { EditableTimeLog } from './editable-time-log';

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
    const tasksQuery = useTasks({ profileId });

    const taskNames = useMemo(() => {
        const map = new Map<number, string>();
        for (const task of tasksQuery.data?.tasks ?? []) map.set(task.id, task.title);
        return map;
    }, [tasksQuery.data]);

    const contextNameFor = (entry: TimeEntryRead): string | null =>
        entry.task_id != null ? taskNames.get(entry.task_id) ?? null : null;

    const entries = entriesQuery.data?.time_entries ?? [];
    const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

    return (
        <section className='mt-[30px]'>
            <div className='mb-2.5 flex items-center justify-between'>
                <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                    Time log
                </h2>
                <span className='font-mono text-[11px] text-text-faint'>
                    {formatHumanDuration(totalSeconds)} tracked
                </span>
            </div>

            {entriesQuery.isError && (
                <p className='font-mono text-[12px] text-danger'>Failed to load time log.</p>
            )}

            {!entriesQuery.isError && entries.length === 0 && (
                <p className='font-mono text-[12px] text-text-faint'>
                    No time tracked for this project yet.
                </p>
            )}

            {entries.length > 0 && (
                <div
                    className='rounded-card border px-4'
                    style={{
                        backgroundColor: 'var(--surface-card-bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    <EditableTimeLog entries={entries} contextNameFor={contextNameFor} />
                </div>
            )}
        </section>
    );
};
