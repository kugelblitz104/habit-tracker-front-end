import { QueryState } from '@/components/ui/query-state';
import { parseServerDate } from '@/lib/date-utils';
import { taskDetailPath } from '@/lib/entity-ref';
import { TaskStatus } from '@/types/types';
import { Link } from 'react-router';
import { useDayTasks } from '../api/get-day-tasks';
import { formatCompactTime } from '@/features/tasks/utils/task-format';

type DayCompletedTasksProps = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

/** The local clock time a task was closed at. */
const closedAt = (closed: string | null | undefined): string | null => {
    if (!closed) return null;
    const instant = parseServerDate(closed);
    return formatCompactTime(`${pad(instant.getHours())}:${pad(instant.getMinutes())}`);
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
export const DayCompletedTasks = ({ profileId, date }: DayCompletedTasksProps) => {
    const query = useDayTasks({ profileId, date });
    const tasks = query.data ?? [];

    return (
        // While `isPlaceholderData` the rows are the previous day's, held on
        // screen on purpose so the card does not collapse mid-navigation.
        <section aria-busy={query.isPlaceholderData}>
            <div className='mb-2.5 flex items-center gap-2'>
                <h2 className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                    Completed
                </h2>
                {tasks.length > 0 && (
                    <span className='font-mono text-[11px] text-text-faint'>{tasks.length}</span>
                )}
            </div>

            <QueryState
                isError={query.isError}
                isLoading={query.isLoading}
                errorMessage='Failed to load the completed tasks for this day.'
                loadingMessage='Loading…'
                size='sm'
            />

            {!query.isError && !query.isLoading && tasks.length === 0 && (
                <p className='font-mono text-[11px] text-text-faint'>Nothing closed on this day.</p>
            )}

            {tasks.length > 0 && (
                <ul className='flex flex-col'>
                    {tasks.map((task) => {
                        const cancelled = task.status === TaskStatus.CANCELLED;
                        const time = closedAt(task.closed_date);
                        return (
                            <li
                                key={task.id}
                                className='flex items-center gap-2.5 border-b py-2'
                                style={{ borderColor: 'var(--color-whenever-ring)' }}
                            >
                                <span
                                    aria-hidden='true'
                                    className='h-1.5 w-1.5 shrink-0 rounded-full'
                                    style={{
                                        backgroundColor: cancelled
                                            ? 'var(--color-status-cancelled)'
                                            : 'var(--color-status-done)'
                                    }}
                                />
                                <Link
                                    to={taskDetailPath(task)}
                                    viewTransition
                                    className={`flex min-h-[24px] min-w-0 flex-1 items-center py-1 font-display text-[13.5px] text-text-muted transition-colors pointer-coarse:min-h-[44px] hover:text-text-primary ${
                                        cancelled ? 'line-through' : ''
                                    }`}
                                    title={task.title}
                                >
                                    {/* Inner span, because `truncate` needs a
                                        block box and the link itself is a flex
                                        row to carry the touch-target floor. */}
                                    <span className='truncate'>{task.title}</span>
                                </Link>
                                {time && (
                                    <span className='shrink-0 font-mono text-[10px] text-text-faint'>
                                        {time}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};
