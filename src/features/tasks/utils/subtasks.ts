import type { TaskRead } from '@/api';
import { statusRank } from './task-controls';

/**
 * Sort subtasks for display using the same status ranking as the main list
 * (in progress → open → scheduled → pending → blocked → needs info → deferred),
 * so in-progress subtasks float to the top and done/cancelled ones sink to the
 * bottom (both struck through). Within a single status the user's manual order
 * (`sort_order`, ascending) drives it, falling back to creation order (with an
 * id tiebreak) for never-reordered subtasks (all sort_order 0). Shared by the
 * editor's SubtaskSection checklist and the read-only TaskDetailBody list so
 * both surfaces agree on ordering.
 */
export const sortSubtasks = (tasks: TaskRead[]): TaskRead[] =>
    [...tasks].sort((a, b) => {
        const ra = statusRank(a.status ?? 0);
        const rb = statusRank(b.status ?? 0);
        if (ra !== rb) return ra - rb;
        const aOrder = a.sort_order ?? 0;
        const bOrder = b.sort_order ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.created_date.localeCompare(b.created_date) || a.id - b.id;
    });
