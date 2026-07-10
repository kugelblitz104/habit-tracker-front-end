import type { TimeEntryRead } from '@/api';
import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useMemo } from 'react';
import { useTimeEntries, useTimeEntrySummary } from '../api/get-time-entries';
import { formatHumanDuration } from '../utils/format-duration';
import { EditableTimeLog } from './editable-time-log';

type RecentEntriesProps = {
    profileId: number | null | undefined;
};

/** Recent time entries for the profile — editable, date-grouped, with a total. */
export const RecentEntries = ({ profileId }: RecentEntriesProps) => {
    const entriesQuery = useTimeEntries({ profileId, limit: 50 });
    const summaryQuery = useTimeEntrySummary({ profileId });
    const tasksQuery = useTasks({ profileId });
    const projectsQuery = useProjects({ profileId, includeArchived: true });

    const taskNames = useMemo(() => {
        const map = new Map<number, string>();
        for (const task of tasksQuery.data?.tasks ?? []) map.set(task.id, task.title);
        return map;
    }, [tasksQuery.data]);

    const projectNames = useMemo(() => {
        const map = new Map<number, string>();
        for (const project of projectsQuery.data?.projects ?? []) map.set(project.id, project.name);
        return map;
    }, [projectsQuery.data]);

    const contextNameFor = (entry: TimeEntryRead): string | null => {
        if (entry.task_id != null) return taskNames.get(entry.task_id) ?? null;
        if (entry.project_id != null) return projectNames.get(entry.project_id) ?? null;
        return null;
    };

    const entries = entriesQuery.data?.time_entries ?? [];
    const total = summaryQuery.data?.total_seconds ?? 0;

    return (
        <section className='mt-8'>
            <div className='mb-3 flex items-center justify-between'>
                <h2 className='font-mono text-[11.5px] uppercase tracking-[0.16em] text-text-muted'>
                    Recent entries
                </h2>
                <span className='font-mono text-[11.5px] text-text-faint'>
                    {formatHumanDuration(total)} tracked
                </span>
            </div>

            {entriesQuery.isError && (
                <p className='font-mono text-[12px] text-danger'>Failed to load time entries.</p>
            )}

            {!entriesQuery.isError && entries.length === 0 && (
                <p className='font-mono text-[12px] text-text-faint'>
                    No time tracked yet. Start a timer above.
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
