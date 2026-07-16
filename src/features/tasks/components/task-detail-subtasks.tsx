import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { TaskStatus } from '@/types/types';
import { useCreateTask } from '../api/create-tasks';
import { useDeleteTask } from '../api/delete-tasks';
import { useTasks } from '../api/get-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { sortSubtasks } from '../utils/subtasks';
import { SubtaskRow } from './subtask-row';
import { formFieldClass, formFieldStyle } from './task-form-fields';

type TaskDetailSubtasksProps = {
    /** Profile the subtasks belong to (undefined while the parent is loading). */
    profileId: number | undefined;
    parentId: number;
};

/**
 * TaskDetailBody's subtasks list — an inline manager so subtasks can be added,
 * renamed, completed and deleted without opening the edit form. (Re-parenting a
 * subtask is a more structural change, so it lives in the editor's
 * SubtaskSection instead.) Subtasks arrive in the profile's tasks-list response
 * (with `parent_id` set) so no extra request is needed. Renders even with zero
 * subtasks so the add input is always available.
 */
export const TaskDetailSubtasks = ({ profileId, parentId }: TaskDetailSubtasksProps) => {
    const queryClient = useQueryClient();
    const subtasksQuery = useTasks({ profileId, includeClosed: true });
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    const [hideDone, setHideDone] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const allTasks = subtasksQuery.data?.tasks ?? [];

    const allSubtasks = useMemo(
        () => sortSubtasks(allTasks.filter((t) => t.parent_id === parentId)),
        [allTasks, parentId]
    );

    const doneCount = allSubtasks.filter((s) => s.status === TaskStatus.DONE).length;
    const subtasks = hideDone
        ? allSubtasks.filter((s) => s.status !== TaskStatus.DONE)
        : allSubtasks;

    // Refresh this parent's single-task query so its subtask counts stay current
    // (add/delete responses don't carry the parent's id).
    const invalidateParent = () =>
        queryClient.invalidateQueries({ queryKey: ['task', { taskId: parentId }] });

    const changeStatus = (subtaskId: number, status: TaskStatus) => {
        updateTask.mutate(
            { taskId: subtaskId, data: { status } },
            { onError: () => toast.error('Failed to update subtask. Please try again.') }
        );
    };

    const renameSubtask = (subtaskId: number, title: string) => {
        updateTask.mutate(
            { taskId: subtaskId, data: { title } },
            { onError: () => toast.error('Failed to rename subtask. Please try again.') }
        );
    };

    const deleteSubtask = (subtaskId: number) => {
        deleteTask.mutate(subtaskId, {
            onSuccess: invalidateParent,
            onError: () => toast.error('Failed to delete subtask. Please try again.')
        });
    };

    // Enter adds and clears immediately, keeping focus for rapid entry; new
    // subtasks land at the bottom of the list (sort_order past the max).
    const handleCreate = () => {
        if (profileId == null) return;
        const title = newTitle.trim();
        if (!title) return;
        setNewTitle('');
        const nextOrder = allSubtasks.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0) + 1;
        createTask.mutate(
            { profile_id: profileId, parent_id: parentId, title, sort_order: nextOrder },
            {
                onSuccess: invalidateParent,
                onError: () => {
                    toast.error('Failed to add subtask. Please try again.');
                    setNewTitle((current) => current || title);
                }
            }
        );
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Swallow Enter so the host pane doesn't save or close.
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleCreate();
        }
    };

    return (
        <div>
            <div className='mb-1.5 flex items-center justify-between gap-2'>
                <h3 className='font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'>
                    Subtasks{allSubtasks.length > 0 ? ` · ${doneCount}/${allSubtasks.length}` : ''}
                </h3>
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

            <div className='flex flex-col gap-1'>
                {subtasks.map((subtask) => (
                    <SubtaskRow
                        key={subtask.id}
                        subtask={subtask}
                        variant='view'
                        onStatusChange={(status) => changeStatus(subtask.id, status)}
                        onRename={(title) => renameSubtask(subtask.id, title)}
                        actions={
                            <button
                                type='button'
                                onClick={() => deleteSubtask(subtask.id)}
                                disabled={deleteTask.isPending}
                                aria-label={`Delete subtask "${subtask.title}"`}
                                title='Delete subtask'
                                className='shrink-0 rounded-full p-1 text-text-faint transition-colors hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-50'
                            >
                                <Trash2 size={13} />
                            </button>
                        }
                    />
                ))}
            </div>

            <input
                ref={inputRef}
                type='text'
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Add a subtask… (Enter)'
                aria-label='New subtask title'
                className={`${formFieldClass} mt-2 placeholder:text-text-faint`}
                style={formFieldStyle}
            />
        </div>
    );
};
