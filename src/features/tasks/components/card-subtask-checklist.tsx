import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { useTasks } from '../api/get-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { useExitingRows } from '../hooks/use-exiting-rows';
import { sortSubtasks } from '../utils/subtasks';

type CardSubtaskChecklistProps = {
    profileId: number;
    parentId: number;
};

/**
 * Inline "clear subtasks quickly" list shown under a task card. Lists the
 * parent's OPEN subtasks (closed ones aren't requested), each a checkbox that
 * completes it — completed subtasks then drop out. Add / remove / rename still
 * live in the task editor.
 */
export const CardSubtaskChecklist = ({ profileId, parentId }: CardSubtaskChecklistProps) => {
    const tasksQuery = useTasks({ profileId, parentId });
    const updateTask = useUpdateTask();

    const subtasks = useMemo(() => sortSubtasks(tasksQuery.data?.tasks ?? []), [tasksQuery.data]);
    // A completed row fills, draws its check and strikes through, then folds
    // away, held past the refetch that drops it.
    const { rows, exitingStatus, holdIfClosing } = useExitingRows(subtasks);

    const complete = (subtask: TaskRead) => {
        holdIfClosing(subtask, TaskStatus.DONE);
        updateTask.mutate({ taskId: subtask.id, data: { status: TaskStatus.DONE } });
    };

    return (
        <div
            className='mt-3 rounded-button border p-2'
            style={{
                backgroundColor: 'var(--surface-input-bg)',
                borderColor: 'var(--surface-input-border)'
            }}
        >
            {rows.length === 0 ? (
                <p className='px-1 py-0.5 font-mono text-label text-text-faint'>
                    All subtasks complete.
                </p>
            ) : (
                rows.map((subtask) => {
                    const done = exitingStatus(subtask.id) != null;
                    return (
                        <div
                            key={subtask.id}
                            className={`grid grid-cols-[minmax(0,1fr)] grid-rows-[1fr] ${
                                done
                                    ? 'motion-safe:grid-rows-[0fr] motion-safe:opacity-0 motion-safe:transition-[grid-template-rows,opacity] motion-safe:delay-[380ms] duration-[280ms] ease-settle'
                                    : ''
                            }`}
                            aria-hidden={done || undefined}
                            inert={done}
                        >
                            <div className={done ? 'overflow-hidden' : undefined}>
                                <button
                                    type='button'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        complete(subtask);
                                    }}
                                    className='group flex w-full items-center gap-2 rounded-[6px] px-1.5 py-1 text-left transition-colors hover:bg-white/5'
                                >
                                    <span
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                            done ? 'motion-safe:animate-pop' : ''
                                        }`}
                                        style={
                                            done
                                                ? {
                                                      backgroundColor: 'var(--color-status-done)',
                                                      borderColor: 'var(--color-status-done)'
                                                  }
                                                : { borderColor: 'var(--surface-input-border)' }
                                        }
                                    >
                                        <Check
                                            size={11}
                                            strokeWidth={3}
                                            className={
                                                done
                                                    ? 'text-status-done-check motion-safe:[&_path]:animate-draw'
                                                    : 'text-text-faint opacity-0 transition-opacity group-hover:opacity-100'
                                            }
                                        />
                                    </span>
                                    <span
                                        className={`truncate font-display text-meta motion-safe:transition-colors ${
                                            done
                                                ? 'text-text-faint line-through'
                                                : 'text-text-secondary'
                                        }`}
                                    >
                                        {subtask.title}
                                    </span>
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};
