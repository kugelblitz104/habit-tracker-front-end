import type { TaskRead } from '@/api';
import { useMemo } from 'react';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { EntitySelect } from './entity-select';

type TaskSelectProps = {
    profileId: number | null | undefined;
    value: number | null;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    id?: string;
};

type TaskOption = { task: TaskRead; isChild: boolean };

/**
 * Order tasks so each child appears directly under its parent. Top-level tasks
 * keep the server order; children follow their parent (also server order).
 * Orphaned children (parent not in the list) fall back to top level.
 */
const buildOrderedOptions = (tasks: TaskRead[]): TaskOption[] => {
    const childrenByParent = new Map<number, TaskRead[]>();
    const topLevel: TaskRead[] = [];
    const ids = new Set(tasks.map((t) => t.id));
    for (const task of tasks) {
        if (task.parent_id != null && ids.has(task.parent_id)) {
            const bucket = childrenByParent.get(task.parent_id) ?? [];
            bucket.push(task);
            childrenByParent.set(task.parent_id, bucket);
        } else {
            topLevel.push(task);
        }
    }
    const ordered: TaskOption[] = [];
    for (const parent of topLevel) {
        ordered.push({ task: parent, isChild: false });
        for (const child of childrenByParent.get(parent.id) ?? []) {
            ordered.push({ task: child, isChild: true });
        }
    }
    return ordered;
};

/**
 * Dropdown that attaches a timer to one of the profile's active tasks (or none).
 * Child (sub)tasks render indented under their parent with a "└" marker.
 * Fetches the active task list itself; closed tasks are excluded by default.
 */
export const TaskSelect = ({ profileId, value, onChange, disabled, id }: TaskSelectProps) => {
    const tasksQuery = useTasks({ profileId });
    const options = useMemo(
        () => buildOrderedOptions(tasksQuery.data?.tasks ?? []),
        [tasksQuery.data]
    );
    const entityOptions = options.map(({ task, isChild }) => ({
        value: task.id,
        label: task.title,
        indent: isChild
    }));

    return (
        <EntitySelect
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            options={entityOptions}
            placeholder='No task (untethered)'
        />
    );
};
