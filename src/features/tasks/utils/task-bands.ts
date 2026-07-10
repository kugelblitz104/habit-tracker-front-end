import type { TaskRead } from '@/api';
import { ACTIVE_TASK_BANDS, type TaskBand } from '@/types/types';

export type BandGroup = {
    band: Exclude<TaskBand, 'hidden'>;
    tasks: TaskRead[];
};

/**
 * Group tasks by the server-computed band, in display order (the UI never sets
 * or computes a band). Tasks with an unknown/hidden band land in no group.
 * Subtasks (`parent_id` set) are excluded entirely — their band value is
 * meaningless and they render nested under their parent in the task editor,
 * never as top-level cards. Shared by the Today and Project band surfaces.
 */
export const groupTasksByBand = (tasks: TaskRead[]): BandGroup[] =>
    ACTIVE_TASK_BANDS.map((band) => ({
        band,
        tasks: tasks.filter((task) => task.parent_id == null && task.band === band)
    }));

/**
 * Count only tasks that actually land in a rendered band, so open/empty-state
 * figures never include tasks (e.g. an unknown/hidden band) shown nowhere.
 */
export const countGroupedTasks = (groups: BandGroup[]): number =>
    groups.reduce((sum, group) => sum + group.tasks.length, 0);
