import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';

/**
 * Sort subtasks for display: completed ones sink to the bottom; within each
 * group, the user's manual order (`sort_order`, ascending) drives it, falling
 * back to creation order (with an id tiebreak) for never-reordered subtasks
 * (all sort_order 0). Shared by the editor's SubtaskSection checklist and the
 * read-only TaskDetailBody list so both surfaces agree on ordering.
 */
export const sortSubtasks = (tasks: TaskRead[]): TaskRead[] =>
    [...tasks].sort((a, b) => {
        const aDone = a.status === TaskStatus.DONE ? 1 : 0;
        const bDone = b.status === TaskStatus.DONE ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        const aOrder = a.sort_order ?? 0;
        const bOrder = b.sort_order ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.created_date.localeCompare(b.created_date) || a.id - b.id;
    });
