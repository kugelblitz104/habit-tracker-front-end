import { describe, expect, it } from 'vitest';

import { makeTask } from '@/test-support/factories';
import { TaskStatus } from '@/types/types';

import { startOfToday } from './compute-band';
import { attentionReasons } from './attention-reasons';

const TODAY = startOfToday(new Date(2026, 7, 13));
// A fixed same-day instant, injected everywhere below that isn't itself
// testing the today-vs-now split (item 1): `now` defaults to the real clock,
// which would make day counts nondeterministic against the fixed `TODAY`.
const NOW = new Date(2026, 7, 13, 12, 0, 0);
const FRESH = '2026-08-13T09:00:00';

describe('attentionReasons', () => {
    it('is empty for a task that is not banded now', () => {
        expect(attentionReasons(makeTask({ updated_date: FRESH }), TODAY, NOW)).toEqual([]);
    });

    it('is empty for a stale task that is otherwise calm', () => {
        // Staleness never bands, so it cannot raise the block on its own.
        const task = makeTask({ updated_date: '2026-01-01T00:00:00' });
        expect(attentionReasons(task, TODAY, NOW)).toEqual([]);
    });

    it('reports overdue days', () => {
        const task = makeTask({ due_date: '2026-07-12', updated_date: FRESH });
        expect(attentionReasons(task, TODAY, NOW)).toEqual(['32d overdue']);
    });

    it('reports "Due today" for a timed task whose time has not passed yet', () => {
        const task = makeTask({ due_date: '2026-08-13', due_time: '18:00', updated_date: FRESH });
        const now = new Date(2026, 7, 13, 14, 0, 0);
        expect(attentionReasons(task, TODAY, now)).toEqual(['Due today']);
    });

    it('reports the bare "Overdue" for a timed task whose time has already passed today', () => {
        const task = makeTask({ due_date: '2026-08-13', due_time: '09:00', updated_date: FRESH });
        const now = new Date(2026, 7, 13, 14, 0, 0);
        expect(attentionReasons(task, TODAY, now)).toEqual(['Overdue']);
    });

    it('reports a past scheduled date', () => {
        const task = makeTask({ scheduled_date: '2026-08-10', updated_date: FRESH });
        expect(attentionReasons(task, TODAY, NOW)).toEqual(['Scheduled 3d ago']);
    });

    it('reports high priority', () => {
        expect(
            attentionReasons(makeTask({ priority: 3, updated_date: FRESH }), TODAY, NOW)
        ).toEqual(['High priority']);
    });

    it('reports blocked with its reason, and without one', () => {
        const withReason = makeTask({
            status: TaskStatus.BLOCKED,
            block_reason: 'waiting on Chris',
            updated_date: FRESH
        });
        expect(attentionReasons(withReason, TODAY, NOW)).toEqual(['Blocked: waiting on Chris']);

        const bare = makeTask({ status: TaskStatus.BLOCKED, updated_date: FRESH });
        expect(attentionReasons(bare, TODAY, NOW)).toEqual(['Blocked']);
    });

    it('collapses a whitespace-only block_reason to the bare "Blocked" form', () => {
        const task = makeTask({
            status: TaskStatus.BLOCKED,
            block_reason: '   ',
            updated_date: FRESH
        });
        expect(attentionReasons(task, TODAY, NOW)).toEqual(['Blocked']);
    });

    it('adds staleness as an extra reason on an already flagged task', () => {
        const task = makeTask({ due_date: '2026-07-12', updated_date: '2026-01-01T00:00:00' });
        expect(attentionReasons(task, TODAY, NOW)).toEqual(['32d overdue', 'No activity in 14d']);
    });

    it('lists every reason in a fixed order', () => {
        const task = makeTask({
            due_date: '2026-07-12',
            scheduled_date: '2026-08-10',
            priority: 3,
            status: TaskStatus.BLOCKED,
            block_reason: 'waiting',
            updated_date: '2026-01-01T00:00:00'
        });
        expect(attentionReasons(task, TODAY, NOW)).toEqual([
            '32d overdue',
            'Scheduled 3d ago',
            'High priority',
            'Blocked: waiting',
            'No activity in 14d'
        ]);
    });
});
