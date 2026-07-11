import { TaskStatus } from '@/types/types';
import { useMemo } from 'react';
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
 * TaskDetailBody's read-only subtasks list: a DONE↔OPEN toggle checklist (no
 * add/remove — that happens in the edit form). Renders nothing while there are
 * no subtasks, matching TaskDetailBody's previous inline behavior.
 */
export const TaskDetailSubtasks = ({ profileId, parentId }: TaskDetailSubtasksProps) => {
    const subtasksQuery = useTasks({ profileId, includeClosed: true });
    const updateTask = useUpdateTask();

    const subtasks = useMemo(() => {
        const own = (subtasksQuery.data?.tasks ?? []).filter((t) => t.parent_id === parentId);
        return sortSubtasks(own);
    }, [subtasksQuery.data, parentId]);

    if (subtasks.length === 0) return null;

    const toggleSubtask = (subtaskId: number, done: boolean) => {
        updateTask.mutate({
            taskId: subtaskId,
            data: { status: done ? TaskStatus.DONE : TaskStatus.OPEN }
        });
    };

    return (
        <div>
            <h3 className='mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'>
                Subtasks · {subtasks.filter((s) => s.status === TaskStatus.DONE).length}/
                {subtasks.length}
            </h3>
            <div className='flex flex-col gap-1'>
                {subtasks.map((subtask) => {
                    const done = subtask.status === TaskStatus.DONE;
                    return (
                        <SubtaskRow
                            key={subtask.id}
                            subtask={subtask}
                            variant='view'
                            onToggle={() => toggleSubtask(subtask.id, !done)}
                        />
                    );
                })}
            </div>
        </div>
    );
};
