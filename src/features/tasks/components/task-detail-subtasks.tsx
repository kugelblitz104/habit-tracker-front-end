import { TaskStatus } from '@/types/types';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTasks } from '../api/get-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { sortSubtasks } from '../utils/subtasks';
import { SubtaskRow } from './subtask-row';

type TaskDetailSubtasksProps = {
    /** Profile the subtasks belong to (undefined while the parent is loading). */
    profileId: number | undefined;
    parentId: number;
};

/**
 * TaskDetailBody's subtasks list: the round status glyph surfaces (and lets you
 * change) each subtask's status inline; adding, removing, promoting and
 * reordering happen in the edit form. Renders nothing while there are no
 * subtasks, matching TaskDetailBody's previous inline behavior.
 */
export const TaskDetailSubtasks = ({ profileId, parentId }: TaskDetailSubtasksProps) => {
    const subtasksQuery = useTasks({ profileId, includeClosed: true });
    const updateTask = useUpdateTask();
    const [hideDone, setHideDone] = useState(false);

    const allSubtasks = useMemo(
        () => sortSubtasks((subtasksQuery.data?.tasks ?? []).filter((t) => t.parent_id === parentId)),
        [subtasksQuery.data, parentId]
    );

    if (allSubtasks.length === 0) return null;

    const doneCount = allSubtasks.filter((s) => s.status === TaskStatus.DONE).length;
    // The "Hide done" toggle drops completed rows entirely (matches the editor).
    const subtasks = hideDone
        ? allSubtasks.filter((s) => s.status !== TaskStatus.DONE)
        : allSubtasks;

    const changeStatus = (subtaskId: number, status: TaskStatus) => {
        updateTask.mutate(
            { taskId: subtaskId, data: { status } },
            { onError: () => toast.error('Failed to update subtask. Please try again.') }
        );
    };

    return (
        <div>
            <div className='mb-1.5 flex items-center justify-between gap-2'>
                <h3 className='font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'>
                    Subtasks · {doneCount}/{allSubtasks.length}
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
                    />
                ))}
            </div>
        </div>
    );
};
