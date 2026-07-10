import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { parseLocalDate } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatShortDate } from '../utils/task-format';
import { StatusControl } from './status-control';

type CompletedSectionProps = {
    profileId: number | null | undefined;
    /** Scope to a single project's closed tasks (project view). */
    projectId?: number | null;
    /** Open a closed task's detail (title click). Omit to render titles inert. */
    onSelectTask?: (taskId: number) => void;
    /** Task currently open in the detail pane, for highlight. */
    selectedTaskId?: number | null;
};

const formatClosed = (closed: string | null | undefined): string | null => {
    if (!closed) return null;
    // closed_date is a datetime; take the date part and format it.
    const datePart = closed.split('T')[0];
    if (!datePart) return null;
    return formatShortDate(parseLocalDate(datePart));
};

/**
 * Collapsed "Completed & closed" disclosure. Shows a count; when open lists the
 * profile's hidden (done/cancelled) tasks with completion dates. Cancelled tasks
 * are struck through with an ✕. Dimmed via `opacity: var(--quiet)`.
 */
export const CompletedSection = ({
    profileId,
    projectId,
    onSelectTask,
    selectedTaskId
}: CompletedSectionProps) => {
    const query = useTasks({
        profileId: profileId ?? undefined,
        projectId: projectId ?? undefined,
        includeClosed: true,
        band: 'hidden'
    });
    // Subtasks (`parent_id` set) never surface as top-level rows — a closed
    // subtask shows only via its parent's progress count, so the disclosure
    // count also reflects top-level tasks only.
    const tasks = (query.data?.tasks ?? []).filter((task) => task.parent_id == null);
    const updateTask = useUpdateTask();

    // Reopen / re-close via the shared status picker. Setting status back to
    // open/active clears closed_date server-side and recomputes the band; the
    // ['tasks', { profileId }] invalidation covers both this (hidden) list and
    // the active-band lists, so the task moves back into the surface.
    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        updateTask.mutate(
            { taskId, data: { status } },
            { onError: () => toast.error('Failed to update task. Please try again.') }
        );
    };

    return (
        <section className='mb-[30px]' style={{ opacity: 'var(--quiet)' }}>
            <Disclosure>
                {({ open }) => (
                    <>
                        <DisclosureButton className='flex w-full items-center gap-2 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-whenever-label outline-none'>
                            Closed
                            <span className='font-normal text-text-faint'>{tasks.length}</span>
                            <ChevronRight
                                size={14}
                                className={`transition-transform ${open ? 'rotate-90' : ''}`}
                            />
                        </DisclosureButton>
                        <DisclosurePanel className='mt-3'>
                            {tasks.length === 0 ? (
                                <p className='font-mono text-[12px] text-text-faint'>
                                    Nothing closed yet.
                                </p>
                            ) : (
                                <ul className='flex flex-col'>
                                    {tasks.map((task) => {
                                        const status = (task.status ??
                                            TaskStatus.DONE) as TaskStatus;
                                        const cancelled = status === TaskStatus.CANCELLED;
                                        const closed = formatClosed(task.closed_date);
                                        return (
                                            <li
                                                key={task.id}
                                                className='flex items-center gap-2 border-b py-2'
                                                style={{
                                                    borderColor: 'var(--color-whenever-ring)'
                                                }}
                                            >
                                                <StatusControl
                                                    status={status}
                                                    onSelect={(next) =>
                                                        handleStatusChange(task.id, next)
                                                    }
                                                    band='whenever'
                                                    openUpward
                                                />
                                                {onSelectTask ? (
                                                    <button
                                                        type='button'
                                                        onClick={() => onSelectTask(task.id)}
                                                        aria-pressed={selectedTaskId === task.id}
                                                        className={`min-w-0 flex-1 truncate text-left font-display text-[13.5px] text-text-muted transition-colors hover:text-text-secondary ${
                                                            cancelled ? 'line-through' : ''
                                                        }`}
                                                        title={task.title}
                                                    >
                                                        {task.title}
                                                    </button>
                                                ) : (
                                                    <span
                                                        className={`min-w-0 flex-1 truncate font-display text-[13.5px] text-text-muted ${
                                                            cancelled ? 'line-through' : ''
                                                        }`}
                                                    >
                                                        {task.title}
                                                    </span>
                                                )}
                                                {closed && (
                                                    <span className='shrink-0 font-mono text-[10px] text-text-faint'>
                                                        {closed}
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </DisclosurePanel>
                    </>
                )}
            </Disclosure>
        </section>
    );
};
