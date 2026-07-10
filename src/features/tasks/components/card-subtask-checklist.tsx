import { TaskStatus } from '@/types/types';
import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { useTasks } from '../api/get-tasks';
import { useUpdateTask } from '../api/update-tasks';

type CardSubtaskChecklistProps = {
    profileId: number;
    parentId: number;
};

/**
 * Inline "clear subtasks quickly" list shown under a task card. Lists the
 * parent's OPEN subtasks (the active task list excludes done/cancelled ones),
 * each a checkbox that completes it — completed subtasks then drop out. Add /
 * remove / rename still live in the task editor.
 */
export const CardSubtaskChecklist = ({ profileId, parentId }: CardSubtaskChecklistProps) => {
    const tasksQuery = useTasks({ profileId });
    const updateTask = useUpdateTask();

    const subtasks = useMemo(
        () =>
            (tasksQuery.data?.tasks ?? [])
                .filter((t) => t.parent_id === parentId)
                .sort((a, b) => a.created_date.localeCompare(b.created_date)),
        [tasksQuery.data, parentId]
    );

    const complete = (subtaskId: number) => {
        updateTask.mutate({ taskId: subtaskId, data: { status: TaskStatus.DONE } });
    };

    return (
        <div
            className='mt-3 rounded-button border p-2'
            style={{
                backgroundColor: 'var(--surface-input-bg)',
                borderColor: 'var(--surface-input-border)'
            }}
        >
            {subtasks.length === 0 ? (
                <p className='px-1 py-0.5 font-mono text-[11px] text-text-faint'>
                    All subtasks complete.
                </p>
            ) : (
                subtasks.map((subtask) => (
                    <button
                        key={subtask.id}
                        type='button'
                        onClick={(e) => {
                            e.stopPropagation();
                            complete(subtask.id);
                        }}
                        className='group flex w-full items-center gap-2 rounded-[6px] px-1.5 py-1 text-left transition-colors hover:bg-white/5'
                    >
                        <span
                            className='flex h-4 w-4 shrink-0 items-center justify-center rounded border'
                            style={{ borderColor: 'var(--surface-input-border)' }}
                        >
                            <Check
                                size={11}
                                strokeWidth={3}
                                className='text-text-faint opacity-0 transition-opacity group-hover:opacity-100'
                            />
                        </span>
                        <span className='truncate font-display text-[12.5px] text-text-secondary'>
                            {subtask.title}
                        </span>
                    </button>
                ))
            )}
        </div>
    );
};
