import { STATUS_META } from '@/features/tasks/components/status-config';
import type { SluggedEntity } from '@/lib/entity-ref';
import { TaskStatus } from '@/types/types';
import { useDayCreatedTasks } from '../api/get-day-tasks';
import { closedOnCreationDay, localClockLabel } from '../utils/day-summary';
import { DayRow, DaySection } from './day-section';

type DayCreatedTasksProps = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
    onSelectTask: (task: SluggedEntity) => void;
    selectedTaskId: number | null;
};

/**
 * What the day picked up, whatever became of it since.
 *
 * A task raised and finished the same day is left to Completed: it is one
 * thing the day did, and listing it twice would read as two.
 */
export const DayCreatedTasks = ({
    profileId,
    date,
    onSelectTask,
    selectedTaskId
}: DayCreatedTasksProps) => {
    const query = useDayCreatedTasks({ profileId, date });
    const tasks = (query.data ?? []).filter((task) => !closedOnCreationDay(task, date));

    return (
        <DaySection
            title='Created'
            meta={tasks.length > 0 ? String(tasks.length) : null}
            isLoading={query.isLoading}
            isError={query.isError}
            isBusy={query.isPlaceholderData}
            errorMessage='Failed to load the tasks created on this day.'
            emptyMessage='Nothing was raised on this day.'
            isEmpty={tasks.length === 0}
        >
            {tasks.map((task) => (
                <DayRow
                    key={task.id}
                    // The dot carries where the task ended up, so a day's
                    // intake reads as "raised, and here is what came of it".
                    dotColor={STATUS_META[task.status as TaskStatus]?.color}
                    title={task.title}
                    onClick={() => onSelectTask(task)}
                    selected={selectedTaskId === task.id}
                    struck={task.status === TaskStatus.CANCELLED}
                    trailing={localClockLabel(task.created_date)}
                />
            ))}
        </DaySection>
    );
};
