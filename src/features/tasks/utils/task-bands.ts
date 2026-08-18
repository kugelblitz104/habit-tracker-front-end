import type { TaskRead } from '@/api';
import { ACTIVE_TASK_BANDS, type TaskBand } from '@/types/types';
import { computeBand, startOfToday } from './compute-band';
import { compareSmart } from './task-controls';

type BandGroup = {
    band: Exclude<TaskBand, 'hidden'>;
    tasks: TaskRead[];
};

/**
 * Group tasks by the client-computed band (`computeBand`), in display order.
 * Tasks banded 'hidden' land in no group. Subtasks (`parent_id` set) are
 * excluded entirely: they render nested under their parent in the task
 * editor, never as top-level cards. Within each band, tasks follow the shared
 * smart ranking (in progress → open → scheduled → pending → blocked → needs
 * info → deferred), then priority + due date. Shared by the Today and Project
 * band surfaces.
 */
export const groupTasksByBand = (tasks: TaskRead[], today: Date = startOfToday()): BandGroup[] =>
    ACTIVE_TASK_BANDS.map((band) => ({
        band,
        tasks: tasks
            .filter((task) => task.parent_id == null && computeBand(task, today) === band)
            .sort(compareSmart)
    }));

/**
 * Count only tasks that actually land in a rendered band, so open/empty-state
 * figures never include tasks (e.g. a hidden band) shown nowhere.
 */
export const countGroupedTasks = (groups: BandGroup[]): number =>
    groups.reduce((sum, group) => sum + group.tasks.length, 0);

/**
 * The last `n` rows of a list should open their status/context menus upward so
 * the popover never covers the section below. Returns the index at which
 * "upward" starts — rows from here to the end open upward.
 */
export const upwardFrom = (count: number): number => Math.max(count - 2, 0);

/**
 * Row prominence per band. Band, not priority, drives the type scale: band is
 * the composite of importance (priority) and urgency (date), so a low-priority
 * task due tomorrow still reads loud. Priority has its own always-legible
 * column of bars plus a text label, independent of this.
 */
export type BandTier = {
    /** Title size, weight and colour. */
    title: string;
    /** Line 2 colour. */
    meta: string;
    /** Row vertical padding. */
    padY: string;
    /**
     * Box the checkbox and status control are centred in. Its height is line 1's
     * line box (`title`'s font size at Tailwind's `leading-snug`, 1.375), so the
     * control centres on the TITLE rather than on the row. A fixed nudge cannot
     * do this: it has to be right whether or not `TaskRowMeta` renders a second
     * line, and the row's height differs between those two cases.
     */
    controlBox: string;
    /**
     * The 3px left rail's fill. Whenever gets none, so the rail reads as
     * "this band is above the floor" rather than as decoration on every row.
     */
    rail: string;
    /** Resting row background. Only Now carries a wash. */
    wash: string;
    /**
     * Left padding that lines the expanded notes / subtask panels up with the
     * title rather than the card edge. Tracks the row's own `pl` (10) +
     * `CONTROL_SIZE[band]` + gap (10), so it has to move when either does. The
     * rail is a border on the block above, so it is already excluded.
     */
    panelIndent: string;
};

export const BAND_TIER: Record<Exclude<TaskBand, 'hidden'>, BandTier> = {
    now: {
        title: 'text-[16px] font-semibold text-text-primary',
        meta: 'text-text-secondary-soft',
        padY: 'py-[12px]',
        controlBox: 'flex h-[22px] items-center',
        rail: 'var(--rail-now)',
        wash: 'var(--surface-row-now)',
        panelIndent: 'pl-[44px]'
    },
    soon: {
        title: 'text-[15px] font-medium text-text-secondary',
        meta: 'text-text-secondary-soft',
        padY: 'py-[9px]',
        controlBox: 'flex h-[20.625px] items-center',
        rail: 'var(--rail-soon)',
        wash: 'transparent',
        panelIndent: 'pl-[40px]'
    },
    whenever: {
        title: 'text-[14px] font-normal text-text-secondary-soft',
        meta: 'text-text-muted',
        padY: 'py-[8px]',
        controlBox: 'flex h-[19.25px] items-center',
        rail: 'transparent',
        wash: 'transparent',
        panelIndent: 'pl-[38px]'
    }
};
