import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';

/**
 * Sort subtasks for display: completed ones sink to the bottom; within each
 * group, creation order (with an id tiebreak for same-instant creates). Shared
 * by the editor's SubtaskSection checklist and the read-only TaskDetailBody
 * list so both surfaces agree on ordering.
 */
export const sortSubtasks = (tasks: TaskRead[]): TaskRead[] =>
    [...tasks].sort((a, b) => {
        const aDone = a.status === TaskStatus.DONE ? 1 : 0;
        const bDone = b.status === TaskStatus.DONE ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.created_date.localeCompare(b.created_date) || a.id - b.id;
    });
