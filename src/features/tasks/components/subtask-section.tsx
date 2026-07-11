import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpFromLine, Check, Trash2 } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useCreateTask } from '../api/create-tasks';
import { useDeleteTask } from '../api/delete-tasks';
import { useTasks } from '../api/get-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { formFieldClass, formFieldStyle, formLabelClass } from './task-form-fields';

type SubtaskSectionProps = {
    /** The task being edited — must be a top-level task (subtasks are one level deep). */
    parent: TaskRead;
};

/**
 * "Subtasks" section of the task editor: a flat checklist of the parent's
 * subtasks plus an inline add input. Subtasks arrive in the profile's tasks-list
 * response with `parent_id` set (fetched with `includeClosed` so completed ones
 * stay visible, checked); rows are ordered by creation date so the list is
 * stable regardless of the server's band/priority ordering. Each row is only a
 * DONE↔OPEN toggle, the title and a ghost delete (no confirm — subtasks are
 * lightweight); editing a subtask's other fields is intentionally out of scope.
 */
export const SubtaskSection = ({ parent }: SubtaskSectionProps) => {
    const queryClient = useQueryClient();
    const tasksQuery = useTasks({ profileId: parent.profile_id, includeClosed: true });
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    const [newTitle, setNewTitle] = useState('');
    const [hideDone, setHideDone] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const allSubtasks = (tasksQuery.data?.tasks ?? []).filter(
        (task) => task.parent_id === parent.id
    );
    const doneCount = allSubtasks.filter((task) => task.status === TaskStatus.DONE).length;

    // Completed subtasks sink to the bottom; within each group, creation order.
    // The "Hide done" toggle drops completed rows entirely.
    const subtasks = allSubtasks
        .filter((task) => !hideDone || task.status !== TaskStatus.DONE)
        .sort((a, b) => {
            const aDone = a.status === TaskStatus.DONE ? 1 : 0;
            const bDone = b.status === TaskStatus.DONE ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;
            return a.created_date.localeCompare(b.created_date) || a.id - b.id;
        });

    const handleToggle = (subtask: TaskRead) => {
        const done = subtask.status === TaskStatus.DONE;
        updateTask.mutate(
            { taskId: subtask.id, data: { status: done ? TaskStatus.OPEN : TaskStatus.DONE } },
            { onError: () => toast.error('Failed to update subtask. Please try again.') }
        );
    };

    // No confirm: subtasks are lightweight (the shared delete mutation has no
    // built-in confirm either). The parent's detail query is refreshed here so
    // its subtask counts stay current — delete responses carry no parent_id.
    const handleDelete = (subtaskId: number) => {
        deleteTask.mutate(subtaskId, {
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['task', { taskId: parent.id }] }),
            onError: () => toast.error('Failed to delete subtask. Please try again.')
        });
    };

    // Promote a subtask to a full top-level task (parent_id → null). The update
    // hook refreshes the list + the subtask itself; the old parent's single-task
    // query is refreshed here so its subtask count updates.
    const handlePromote = (subtaskId: number) => {
        updateTask.mutate(
            { taskId: subtaskId, data: { parent_id: null } },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: ['task', { taskId: parent.id }]
                    });
                    toast.success('Promoted to a task');
                },
                onError: () => toast.error('Failed to promote subtask. Please try again.')
            }
        );
    };

    // Enter creates and clears immediately, keeping focus for rapid entry; the
    // typed title is restored on failure (only if nothing new was typed since).
    const handleCreate = () => {
        const title = newTitle.trim();
        if (!title) return;
        setNewTitle('');
        createTask.mutate(
            { profile_id: parent.profile_id, parent_id: parent.id, title },
            {
                onError: () => {
                    toast.error('Failed to add subtask. Please try again.');
                    setNewTitle((current) => current || title);
                }
            }
        );
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Swallow Enter so the host pane/editor doesn't save or close.
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleCreate();
        }
    };

    return (
        <div>
            <div className='mb-1 flex items-center justify-between gap-2'>
                <span className={`${formLabelClass} mb-0`}>
                    Subtasks
                    {allSubtasks.length > 0 && (
                        <span className='ml-1.5 font-normal normal-case tracking-normal'>
                            {doneCount}/{allSubtasks.length}
                        </span>
                    )}
                </span>
                {doneCount > 0 && (
                    <button
                        type='button'
                        onClick={() => setHideDone((v) => !v)}
                        className='font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint transition-colors hover:text-text-secondary'
                    >
                        {hideDone ? 'Show done' : 'Hide done'}
                    </button>
                )}
            </div>

            {tasksQuery.isLoading && (
                <p className='font-mono text-[11px] text-text-faint'>Loading subtasks…</p>
            )}
            {tasksQuery.isError && (
                <p className='font-mono text-[11px] text-danger'>Failed to load subtasks.</p>
            )}

            {subtasks.length > 0 && (
                <ul className='mb-1.5 flex flex-col'>
                    {subtasks.map((subtask) => {
                        const done = subtask.status === TaskStatus.DONE;
                        return (
                            <li
                                key={subtask.id}
                                className='flex items-center gap-2 border-b py-1.5'
                                style={{ borderColor: 'var(--surface-input-border)' }}
                            >
                                <button
                                    type='button'
                                    role='checkbox'
                                    aria-checked={done}
                                    aria-label={
                                        done
                                            ? `Mark "${subtask.title}" not done`
                                            : `Mark "${subtask.title}" done`
                                    }
                                    onClick={() => handleToggle(subtask)}
                                    disabled={updateTask.isPending}
                                    className='flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors disabled:cursor-not-allowed'
                                    style={{
                                        borderColor: done
                                            ? 'var(--color-status-done-check)'
                                            : 'var(--surface-input-border)',
                                        backgroundColor: done
                                            ? 'rgba(63, 107, 74, 0.35)'
                                            : 'transparent'
                                    }}
                                >
                                    {done && (
                                        <Check
                                            size={11}
                                            style={{ color: 'var(--color-status-done-check)' }}
                                        />
                                    )}
                                </button>
                                <span
                                    className={`min-w-0 flex-1 truncate font-mono text-[12px] ${
                                        done
                                            ? 'text-text-faint line-through'
                                            : 'text-text-secondary'
                                    }`}
                                    title={subtask.title}
                                >
                                    {subtask.title}
                                </span>
                                <button
                                    type='button'
                                    onClick={() => handlePromote(subtask.id)}
                                    disabled={updateTask.isPending}
                                    aria-label={`Promote subtask "${subtask.title}" to a task`}
                                    title='Promote to a task'
                                    className='shrink-0 rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                    <ArrowUpFromLine size={12} />
                                </button>
                                <button
                                    type='button'
                                    onClick={() => handleDelete(subtask.id)}
                                    disabled={deleteTask.isPending}
                                    aria-label={`Delete subtask "${subtask.title}"`}
                                    title='Delete subtask'
                                    className='shrink-0 rounded-full p-1 text-text-faint transition-colors hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                    <Trash2 size={12} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <input
                ref={inputRef}
                type='text'
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Add a subtask… (Enter)'
                aria-label='New subtask title'
                className={`${formFieldClass} placeholder:text-text-faint`}
                style={formFieldStyle}
            />
        </div>
    );
};
