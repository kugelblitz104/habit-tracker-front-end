import { beforeEach, describe, expect, it } from 'vitest';

import { startOfToday } from '@/features/tasks/utils/compute-band';
import { makeTask, resetSeq } from '@/test-support/factories';
import { ACTIVE_TASK_BANDS, TaskStatus } from '@/types/types';

import { countGroupedTasks, groupTasksByBand, SOON_MIN_ROWS, upwardFrom } from './task-bands';

/** Titles per band, in band order — the assertion shape for the grouping tests. */
const titlesOf = (groups: { tasks: { title: string }[] }[]): string[][] =>
    groups.map((group) => group.tasks.map((task) => task.title));

/** `titlesOf` as a definite triple, for assertions about a single section. */
const bandsOf = (groups: { tasks: { title: string }[] }[]): [string[], string[], string[]] => {
    const [now = [], soon = [], whenever = []] = titlesOf(groups);
    return [now, soon, whenever];
};

const TODAY = startOfToday(new Date(2026, 7, 13));

beforeEach(resetSeq);

describe('groupTasksByBand', () => {
    it('always returns the three active bands in display order, even when empty', () => {
        const groups = groupTasksByBand([]);
        expect(groups.map((group) => group.band)).toEqual(['now', 'soon', 'whenever']);
        expect(groups.map((group) => group.band)).toEqual(ACTIVE_TASK_BANDS);
        expect(titlesOf(groups)).toEqual([[], [], []]);
    });

    it('groups into now, soon and whenever from the task inputs', () => {
        const tasks = [
            makeTask({ title: 'undated low' }), // whenever
            makeTask({ title: 'due next week', due_date: '2026-08-18' }), // soon
            makeTask({ title: 'overdue', due_date: '2026-07-01' }) // now
        ];
        const groups = groupTasksByBand(tasks, TODAY);
        expect(groups.map((group) => group.band)).toEqual(['now', 'soon', 'whenever']);
        expect(groups.map((group) => group.tasks.map((task) => task.title))).toEqual([
            ['overdue'],
            ['due next week'],
            ['undated low']
        ]);
    });

    it('excludes subtasks entirely, whatever band their inputs would give them', () => {
        const parent = makeTask({ title: 'parent', priority: 3 }); // now
        const tasks = [
            parent,
            makeTask({ title: 'sub-now', priority: 3, parent_id: parent.id }),
            makeTask({ title: 'sub-soon', priority: 2, parent_id: parent.id }),
            makeTask({ title: 'sub-whenever', parent_id: parent.id })
        ];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))).toEqual([['parent'], [], []]);
    });

    it('treats an explicitly null parent_id as a top-level task', () => {
        const tasks = [makeTask({ title: 'top', priority: 2, parent_id: null })]; // soon
        expect(titlesOf(groupTasksByBand(tasks, TODAY))).toEqual([[], ['top'], []]);
    });

    it('drops hidden (closed) tasks into no group at all', () => {
        const tasks = [
            makeTask({ title: 'kept', priority: 3 }), // now
            makeTask({ title: 'closed', status: TaskStatus.DONE })
        ];
        const groups = groupTasksByBand(tasks, TODAY);
        expect(titlesOf(groups)).toEqual([['kept'], [], []]);
        expect(countGroupedTasks(groups)).toBe(1);
    });

    it('orders each band by the shared smart ranking', () => {
        const tasks = [
            makeTask({ title: 'needs-info', status: TaskStatus.NEEDS_INFO, priority: 3 }),
            makeTask({ title: 'open-high', status: TaskStatus.OPEN, priority: 3 }),
            makeTask({ title: 'running', status: TaskStatus.IN_PROGRESS, priority: 3 }),
            makeTask({ title: 'blocked', status: TaskStatus.BLOCKED })
        ];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))[0]).toEqual([
            'running',
            'open-high',
            'blocked',
            'needs-info'
        ]);
    });

    it('sorts each band independently', () => {
        const tasks = [
            makeTask({ title: 'now-low', due_date: '2026-08-10', priority: 1 }),
            makeTask({ title: 'soon-low', due_date: '2026-08-18', priority: 0 }),
            makeTask({ title: 'now-high', due_date: '2026-08-10', priority: 3 }),
            makeTask({ title: 'soon-high', due_date: '2026-08-18', priority: 2 })
        ];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))).toEqual([
            ['now-high', 'now-low'],
            ['soon-high', 'soon-low'],
            []
        ]);
    });

    it('does not mutate or reorder the input array', () => {
        const tasks = [
            makeTask({ title: 'low', priority: 1 }),
            makeTask({ title: 'high', priority: 3 })
        ];
        groupTasksByBand(tasks, TODAY);
        expect(tasks.map((task) => task.title)).toEqual(['low', 'high']);
    });
});

describe('groupTasksByBand: topping Soon up from Low', () => {
    /** `n` genuinely-Soon tasks, so a test can set Soon's starting count. */
    const soonTasks = (n: number) =>
        Array.from({ length: n }, (_, i) => makeTask({ title: `soon-${i}`, priority: 2 }));

    it('promotes Low whenever-tasks into Soon while Soon is under the minimum', () => {
        const tasks = [
            makeTask({ title: 'low-a', priority: 1 }),
            makeTask({ title: 'low-b', priority: 1 })
        ];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))).toEqual([[], ['low-a', 'low-b'], []]);
    });

    it('moves the promoted tasks out of Whenever rather than copying them', () => {
        const tasks = [makeTask({ title: 'low', priority: 1 })];
        const groups = groupTasksByBand(tasks, TODAY);
        expect(titlesOf(groups)).toEqual([[], ['low'], []]);
        // One row, not two: a copy would double-count into Today's "N open".
        expect(countGroupedTasks(groups)).toBe(1);
    });

    it('promotes only as many as the deficit', () => {
        const tasks = [
            ...soonTasks(SOON_MIN_ROWS - 2),
            makeTask({ title: 'low-a', priority: 1 }),
            makeTask({ title: 'low-b', priority: 1 }),
            makeTask({ title: 'low-c', priority: 1 })
        ];
        const [now, soon, whenever] = bandsOf(groupTasksByBand(tasks, TODAY));
        expect(now).toEqual([]);
        expect(soon).toHaveLength(SOON_MIN_ROWS);
        expect(soon.slice(-2)).toEqual(['low-a', 'low-b']);
        expect(whenever).toEqual(['low-c']);
    });

    it('promotes nothing once Soon has reached the minimum on its own', () => {
        const tasks = [...soonTasks(SOON_MIN_ROWS), makeTask({ title: 'low', priority: 1 })];
        const [, soon, whenever] = bandsOf(groupTasksByBand(tasks, TODAY));
        expect(soon).toHaveLength(SOON_MIN_ROWS);
        expect(whenever).toEqual(['low']);
    });

    it('leaves Soon short when there are not enough Low tasks to fill it', () => {
        const tasks = [makeTask({ title: 'low', priority: 1 })];
        const [, soon] = bandsOf(groupTasksByBand(tasks, TODAY));
        expect(soon).toEqual(['low']);
        expect(soon.length).toBeLessThan(SOON_MIN_ROWS);
    });

    it('never promotes priority None - that is the whole difference from Low', () => {
        const tasks = [
            makeTask({ title: 'none-a', priority: 0 }),
            makeTask({ title: 'none-b', priority: 0 })
        ];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))).toEqual([[], [], ['none-a', 'none-b']]);
    });

    it('never promotes a Deferred Low task, since Deferred overrides urgency', () => {
        const tasks = [
            makeTask({ title: 'deferred-low', priority: 1, status: TaskStatus.DEFERRED }),
            makeTask({ title: 'plain-low', priority: 1 })
        ];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))).toEqual([
            [],
            ['plain-low'],
            ['deferred-low']
        ]);
    });

    it('appends filler after the genuine Soon members instead of interleaving it', () => {
        // compareSmart ranks status before priority, so interleaving would put
        // the in-progress Low task above the genuinely-Soon needs-info one.
        const tasks = [
            makeTask({ title: 'genuine-soon', priority: 2, status: TaskStatus.NEEDS_INFO }),
            makeTask({ title: 'filler', priority: 1, status: TaskStatus.IN_PROGRESS })
        ];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))[1]).toEqual(['genuine-soon', 'filler']);
    });

    it('treats a Low task already banded Soon by its date as a genuine member', () => {
        const tasks = [
            makeTask({ title: 'low-dated', priority: 1, due_date: '2026-08-18' }),
            makeTask({ title: 'low-undated', priority: 1 })
        ];
        const groups = groupTasksByBand(tasks, TODAY);
        expect(titlesOf(groups)).toEqual([[], ['low-dated', 'low-undated'], []]);
        expect(countGroupedTasks(groups)).toBe(2);
    });

    it('never promotes a subtask, whatever its priority', () => {
        const parent = makeTask({ title: 'parent', priority: 2 });
        const tasks = [parent, makeTask({ title: 'sub-low', priority: 1, parent_id: parent.id })];
        expect(titlesOf(groupTasksByBand(tasks, TODAY))).toEqual([[], ['parent'], []]);
    });

    it('does not mutate the input array while promoting', () => {
        const tasks = [
            makeTask({ title: 'low', priority: 1 }),
            makeTask({ title: 'high', priority: 3 })
        ];
        groupTasksByBand(tasks, TODAY);
        expect(tasks.map((task) => task.title)).toEqual(['low', 'high']);
    });
});

describe('countGroupedTasks', () => {
    it('counts zero for empty bands', () => {
        expect(countGroupedTasks(groupTasksByBand([]))).toBe(0);
    });

    it('sums across every band', () => {
        const tasks = [
            makeTask({ priority: 3 }), // now
            makeTask({ priority: 3 }), // now
            makeTask({ priority: 2 }), // soon
            makeTask({}) // whenever
        ];
        expect(countGroupedTasks(groupTasksByBand(tasks, TODAY))).toBe(4);
    });

    it('ignores tasks that were never grouped, so it can be lower than the input length', () => {
        const parent = makeTask({ priority: 3 }); // now
        const tasks = [
            parent,
            makeTask({ status: TaskStatus.DONE }), // hidden
            makeTask({ priority: 3, parent_id: parent.id }) // now, but a subtask
        ];
        expect(tasks).toHaveLength(3);
        expect(countGroupedTasks(groupTasksByBand(tasks, TODAY))).toBe(1);
    });
});

describe('upwardFrom', () => {
    it('never returns a negative index for short lists', () => {
        expect(upwardFrom(0)).toBe(0);
        expect(upwardFrom(1)).toBe(0);
        expect(upwardFrom(2)).toBe(0);
    });

    it('opens the last two rows upward', () => {
        expect(upwardFrom(3)).toBe(1);
        expect(upwardFrom(10)).toBe(8);
        expect(10 - upwardFrom(10)).toBe(2);
    });

    it('clamps a nonsensical negative count to zero', () => {
        expect(upwardFrom(-5)).toBe(0);
    });
});
