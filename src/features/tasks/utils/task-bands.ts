import type { TaskRead } from '@/api';
import { ACTIVE_TASK_BANDS, TaskStatus, type TaskBand } from '@/types/types';
import { computeBand, startOfToday } from './compute-band';
import { PRIORITY_LOW } from './priority-config';
import { compareSmart } from './task-controls';

type ActiveBand = Exclude<TaskBand, 'hidden'>;

type BandGroup = {
    band: ActiveBand;
    tasks: TaskRead[];
};

/**
 * Soon is topped up to this many rows from Low-priority tasks. A ceiling on
 * filler rather than a guarantee: with fewer eligible Low tasks Soon stays
 * short. Making it per-profile means a new property on three Profile schemas,
 * so it is a schema break rather than a settings change.
 */
export const SOON_MIN_ROWS = 5;

/**
 * The Low-priority tasks to pull up into Soon, in the order they were given.
 *
 * This is the only effect priority 1 has anywhere, and the only thing that
 * distinguishes it from priority 0 - None is never a candidate. Candidates come
 * from Whenever alone, so a Low task already banded Soon or Now by its own date
 * stays where it is. Deferred is excluded because `computeBand` forces those to
 * Whenever precisely to keep them out of the way; promoting one would undo the
 * only thing Deferred means.
 */
const soonFiller = (soonCount: number, wheneverTasks: TaskRead[]): TaskRead[] => {
    const deficit = SOON_MIN_ROWS - soonCount;
    if (deficit <= 0) return [];
    return wheneverTasks
        .filter(
            (task) => (task.priority ?? 0) === PRIORITY_LOW && task.status !== TaskStatus.DEFERRED
        )
        .slice(0, deficit);
};

/**
 * Group tasks by the client-computed band (`computeBand`), in display order.
 * Tasks banded 'hidden' land in no group. Subtasks (`parent_id` set) are
 * excluded entirely: they render nested under their parent in the task
 * editor, never as top-level cards. Within each band, tasks follow the shared
 * smart ranking (in progress → open → scheduled → pending → blocked → needs
 * info → deferred), then priority + due date.
 *
 * A thin Soon is then topped up from Low-priority Whenever tasks (see
 * `soonFiller`). The filler is **moved**, not copied - it leaves Whenever - so
 * `countGroupedTasks` cannot count it twice into Today's "N open" figure. It is
 * appended after Soon's own members rather than merged into the sort, because
 * `compareSmart` ranks status ahead of priority and would otherwise let an
 * in-progress Low task outrank a genuinely-Soon one.
 */
export const groupTasksByBand = (tasks: TaskRead[], today: Date = startOfToday()): BandGroup[] => {
    const topLevel = tasks.filter((task) => task.parent_id == null);
    const inBand = (band: ActiveBand): TaskRead[] =>
        topLevel.filter((task) => computeBand(task, today) === band).sort(compareSmart);

    const soon = inBand('soon');
    const whenever = inBand('whenever');
    const promoted = soonFiller(soon.length, whenever);
    const promotedIds = new Set(promoted.map((task) => task.id));

    const tasksFor: Record<ActiveBand, TaskRead[]> = {
        now: inBand('now'),
        soon: [...soon, ...promoted],
        whenever: whenever.filter((task) => !promotedIds.has(task.id))
    };
    return ACTIVE_TASK_BANDS.map((band) => ({ band, tasks: tasksFor[band] }));
};

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
