import { beforeEach, describe, expect, it } from 'vitest';

import { makeTask, resetSeq } from '@/test-support/factories';
import { ACTIVE_TASK_BANDS, TaskStatus } from '@/types/types';

import { countGroupedTasks, groupTasksByBand, toActiveBand, upwardFrom } from './task-bands';

/** Titles per band, in band order — the assertion shape for the grouping tests. */
const titlesOf = (groups: { tasks: { title: string }[] }[]): string[][] =>
    groups.map((group) => group.tasks.map((task) => task.title));

beforeEach(resetSeq);

describe('groupTasksByBand', () => {
    it('always returns the three active bands in display order, even when empty', () => {
        const groups = groupTasksByBand([]);
        expect(groups.map((group) => group.band)).toEqual(['now', 'soon', 'whenever']);
        expect(groups.map((group) => group.band)).toEqual(ACTIVE_TASK_BANDS);
        expect(titlesOf(groups)).toEqual([[], [], []]);
    });

    it('files each task under its server-computed band', () => {
        const tasks = [
            makeTask({ title: 'whenever-1', band: 'whenever' }),
            makeTask({ title: 'now-1', band: 'now' }),
            makeTask({ title: 'soon-1', band: 'soon' })
        ];
        expect(titlesOf(groupTasksByBand(tasks))).toEqual([['now-1'], ['soon-1'], ['whenever-1']]);
    });

    it('excludes subtasks entirely, whatever band they carry', () => {
        const parent = makeTask({ title: 'parent', band: 'now' });
        const tasks = [
            parent,
            makeTask({ title: 'sub-now', band: 'now', parent_id: parent.id }),
            makeTask({ title: 'sub-soon', band: 'soon', parent_id: parent.id }),
            makeTask({ title: 'sub-whenever', band: 'whenever', parent_id: parent.id })
        ];
        expect(titlesOf(groupTasksByBand(tasks))).toEqual([['parent'], [], []]);
    });

    it('treats an explicitly null parent_id as a top-level task', () => {
        const tasks = [makeTask({ title: 'top', band: 'soon', parent_id: null })];
        expect(titlesOf(groupTasksByBand(tasks))).toEqual([[], ['top'], []]);
    });

    it('drops hidden, unknown and missing bands into no group at all', () => {
        const tasks = [
            makeTask({ title: 'kept', band: 'now' }),
            makeTask({ title: 'closed', band: 'hidden', status: TaskStatus.DONE }),
            makeTask({ title: 'bogus', band: 'later' }),
            makeTask({ title: 'unset', band: undefined })
        ];
        const groups = groupTasksByBand(tasks);
        expect(titlesOf(groups)).toEqual([['kept'], [], []]);
        expect(countGroupedTasks(groups)).toBe(1);
    });

    it('orders each band by the shared smart ranking', () => {
        const tasks = [
            makeTask({ title: 'deferred', band: 'now', status: TaskStatus.DEFERRED, priority: 3 }),
            makeTask({ title: 'open-high', band: 'now', priority: 3 }),
            makeTask({ title: 'running', band: 'now', status: TaskStatus.IN_PROGRESS }),
            makeTask({ title: 'open-low', band: 'now', priority: 1 })
        ];
        expect(titlesOf(groupTasksByBand(tasks))[0]).toEqual([
            'running',
            'open-high',
            'open-low',
            'deferred'
        ]);
    });

    it('sorts each band independently', () => {
        const tasks = [
            makeTask({ title: 'now-low', band: 'now', priority: 1 }),
            makeTask({ title: 'soon-low', band: 'soon', priority: 1 }),
            makeTask({ title: 'now-high', band: 'now', priority: 3 }),
            makeTask({ title: 'soon-high', band: 'soon', priority: 3 })
        ];
        expect(titlesOf(groupTasksByBand(tasks))).toEqual([
            ['now-high', 'now-low'],
            ['soon-high', 'soon-low'],
            []
        ]);
    });

    it('does not mutate or reorder the input array', () => {
        const tasks = [
            makeTask({ title: 'low', band: 'now', priority: 1 }),
            makeTask({ title: 'high', band: 'now', priority: 3 })
        ];
        groupTasksByBand(tasks);
        expect(tasks.map((task) => task.title)).toEqual(['low', 'high']);
    });
});

describe('countGroupedTasks', () => {
    it('counts zero for empty bands', () => {
        expect(countGroupedTasks(groupTasksByBand([]))).toBe(0);
    });

    it('sums across every band', () => {
        const tasks = [
            makeTask({ band: 'now' }),
            makeTask({ band: 'now' }),
            makeTask({ band: 'soon' }),
            makeTask({ band: 'whenever' })
        ];
        expect(countGroupedTasks(groupTasksByBand(tasks))).toBe(4);
    });

    it('ignores tasks that were never grouped, so it can be lower than the input length', () => {
        const parent = makeTask({ band: 'now' });
        const tasks = [
            parent,
            makeTask({ band: 'hidden' }),
            makeTask({ band: 'now', parent_id: parent.id })
        ];
        expect(tasks).toHaveLength(3);
        expect(countGroupedTasks(groupTasksByBand(tasks))).toBe(1);
    });
});

describe('toActiveBand', () => {
    it('passes now and soon straight through', () => {
        expect(toActiveBand('now')).toBe('now');
        expect(toActiveBand('soon')).toBe('soon');
    });

    it('maps whenever to itself', () => {
        expect(toActiveBand('whenever')).toBe('whenever');
    });

    it('folds hidden, missing and unknown bands into whenever', () => {
        expect(toActiveBand('hidden')).toBe('whenever');
        expect(toActiveBand(undefined)).toBe('whenever');
        expect(toActiveBand('')).toBe('whenever');
        expect(toActiveBand('later')).toBe('whenever');
        // The check is exact and case-sensitive.
        expect(toActiveBand('Now')).toBe('whenever');
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
