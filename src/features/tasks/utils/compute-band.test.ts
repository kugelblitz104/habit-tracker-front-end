import { describe, expect, it } from 'vitest';

import { makeTask } from '@/test-support/factories';
import { TaskStatus } from '@/types/types';

import { bandRank, computeBand, isStale, startOfToday, toActiveBand } from './compute-band';

// Fixed local-midnight "today" so no test reads the clock.
const TODAY = startOfToday(new Date(2026, 7, 13));

describe('computeBand', () => {
    it('hides done and cancelled', () => {
        expect(computeBand(makeTask({ status: TaskStatus.DONE }), TODAY)).toBe('hidden');
        expect(computeBand(makeTask({ status: TaskStatus.CANCELLED }), TODAY)).toBe('hidden');
    });

    it('hides a cancelled task even when it is also blocked', () => {
        // `hidden` must win over the new Blocked condition below it.
        const task = makeTask({ status: TaskStatus.CANCELLED, block_reason: 'waiting' });
        expect(computeBand(task, TODAY)).toBe('hidden');
    });

    it('parks deferred in whenever even when overdue', () => {
        // Deferred is checked before the date rule, so it overrides urgency.
        const task = makeTask({ status: TaskStatus.DEFERRED, due_date: '2026-07-01' });
        expect(computeBand(task, TODAY)).toBe('whenever');
    });

    it('bands now for a due date today or past', () => {
        expect(computeBand(makeTask({ due_date: '2026-08-13' }), TODAY)).toBe('now');
        expect(computeBand(makeTask({ due_date: '2026-07-01' }), TODAY)).toBe('now');
    });

    it('bands now from the scheduled date when it is the earlier one', () => {
        const task = makeTask({ due_date: '2026-09-01', scheduled_date: '2026-08-12' });
        expect(computeBand(task, TODAY)).toBe('now');
    });

    it('bands now for priority 3 with no dates', () => {
        expect(computeBand(makeTask({ priority: 3 }), TODAY)).toBe('now');
    });

    it('bands now for blocked with no dates and no priority', () => {
        expect(computeBand(makeTask({ status: TaskStatus.BLOCKED }), TODAY)).toBe('now');
    });

    it('bands soon within seven days inclusive, whenever past it', () => {
        expect(computeBand(makeTask({ due_date: '2026-08-20' }), TODAY)).toBe('soon');
        expect(computeBand(makeTask({ due_date: '2026-08-21' }), TODAY)).toBe('whenever');
    });

    it('bands soon for priority 2 with no dates', () => {
        expect(computeBand(makeTask({ priority: 2 }), TODAY)).toBe('soon');
    });

    it('bands whenever for an undated priority 0 or 1 task', () => {
        expect(computeBand(makeTask({ priority: 0 }), TODAY)).toBe('whenever');
        expect(computeBand(makeTask({ priority: 1 }), TODAY)).toBe('whenever');
    });
});

describe('isStale', () => {
    it('is true at exactly the 14 day boundary and false a day inside it', () => {
        expect(isStale(makeTask({ updated_date: '2026-07-30T12:00:00' }), TODAY)).toBe(true);
        expect(isStale(makeTask({ updated_date: '2026-07-31T12:00:00' }), TODAY)).toBe(false);
    });

    it('falls back to created_date when updated_date is null', () => {
        const task = makeTask({ updated_date: null, created_date: '2026-07-01T00:00:00' });
        expect(isStale(task, TODAY)).toBe(true);
    });

    it('never flags statuses that are untouched by design', () => {
        for (const status of [TaskStatus.SCHEDULED, TaskStatus.PENDING, TaskStatus.DEFERRED]) {
            const task = makeTask({ status, updated_date: '2026-01-01T00:00:00' });
            expect(isStale(task, TODAY)).toBe(false);
        }
    });

    it('flags the statuses where being untouched is a problem', () => {
        for (const status of [
            TaskStatus.OPEN,
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
            TaskStatus.NEEDS_INFO
        ]) {
            const task = makeTask({ status, updated_date: '2026-01-01T00:00:00' });
            expect(isStale(task, TODAY)).toBe(true);
        }
    });
});

describe('toActiveBand', () => {
    it('maps hidden and null onto whenever', () => {
        expect(toActiveBand('hidden')).toBe('whenever');
        expect(toActiveBand(null)).toBe('whenever');
        expect(toActiveBand(undefined)).toBe('whenever');
    });

    it('passes the three active bands through', () => {
        expect(toActiveBand('now')).toBe('now');
        expect(toActiveBand('soon')).toBe('soon');
        expect(toActiveBand('whenever')).toBe('whenever');
    });

    it('folds an empty band into whenever', () => {
        expect(toActiveBand('')).toBe('whenever');
    });

    it('folds an unrecognised band into whenever', () => {
        expect(toActiveBand('later')).toBe('whenever');
    });

    it('is case-sensitive, so a differently-cased band does not pass through', () => {
        expect(toActiveBand('Now')).toBe('whenever');
    });
});

describe('bandRank', () => {
    it('ranks now above soon above whenever', () => {
        expect(bandRank('now')).toBeLessThan(bandRank('soon'));
        expect(bandRank('soon')).toBeLessThan(bandRank('whenever'));
    });

    it('ranks hidden and null as whenever', () => {
        expect(bandRank('hidden')).toBe(bandRank('whenever'));
        expect(bandRank(null)).toBe(bandRank('whenever'));
    });
});
