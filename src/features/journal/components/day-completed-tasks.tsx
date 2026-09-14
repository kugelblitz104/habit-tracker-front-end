import type { SluggedEntity } from '@/lib/entity-ref';
import { TaskStatus } from '@/types/types';
import { useDayTasks } from '../api/get-day-tasks';
import { localClockLabel } from '../utils/day-summary';
import { DayRow, DaySection } from './day-section';

type DayCompletedTasksProps = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
    /**
     * Open a task's detail. Passed the task, not just its id, so a narrow
     * screen's navigation can use the readable slug URL.
     */
    onSelectTask: (task: SluggedEntity) => void;
    /** Task currently open in the detail pane, for the pressed state. */
    selectedTaskId: number | null;
};

/**
 * What was finished on this day, read live from `Task.closed_date` rather than
 * stored in the entry.
 *
 * The live binding is the point: the equivalent Obsidian setup listed
 * completed tasks through logic that went dead, and deriving the list on every
 * read means it cannot rot. A task finished last Tuesday but closed today is
 * fixed by editing its closed date, not by editing the journal.
 */
export const DayCompletedTasks = ({
    profileId,
    date,
    onSelectTask,
    selectedTaskId
}: DayCompletedTasksProps) => {
    const query = useDayTasks({ profileId, date });
    const tasks = query.data ?? [];

    return (
        <DaySection
            title='Completed'
            meta={tasks.length > 0 ? String(tasks.length) : null}
            isLoading={query.isLoading}
            isError={query.isError}
            isBusy={query.isPlaceholderData}
            errorMessage='Failed to load the completed tasks for this day.'
            emptyMessage='Nothing closed on this day.'
            isEmpty={tasks.length === 0}
        >
            {tasks.map((task) => {
                const cancelled = task.status === TaskStatus.CANCELLED;
                return (
                    <DayRow
                        key={task.id}
                        dotColor={
                            cancelled ? 'var(--color-status-cancelled)' : 'var(--color-status-done)'
                        }
                        title={task.title}
                        onClick={() => onSelectTask(task)}
                        selected={selectedTaskId === task.id}
                        struck={cancelled}
                        trailing={localClockLabel(task.closed_date)}
                    />
                );
            })}
        </DaySection>
    );
};
