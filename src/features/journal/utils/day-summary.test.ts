import type { HabitRead, TaskRead, TimeEntryRead, TrackerRead } from '@/api';
import { TrackerStatus } from '@/types/types';
import { describe, expect, it } from 'vitest';
import {
    closedOnCreationDay,
    groupTimeByProject,
    habitsExpectedOn,
    totalTimeSeconds
} from './day-summary';

const entry = (seconds: number | null, projectId: number | null = null): TimeEntryRead =>
    ({
        id: Math.random(),
        duration_seconds: seconds,
        resolved_project_id: projectId
    }) as TimeEntryRead;

describe('groupTimeByProject', () => {
    it('sums each project and orders by the biggest total', () => {
        const groups = groupTimeByProject([
            entry(600, 1),
            entry(3600, 2),
            entry(1200, 1),
            entry(300, 2)
        ]);

        expect(groups).toEqual([
            { projectId: 2, seconds: 3900 },
            { projectId: 1, seconds: 1800 }
        ]);
    });

    it('keeps unassigned time in its own bucket rather than dropping it', () => {
        const groups = groupTimeByProject([entry(900), entry(60, 1)]);

        expect(groups).toEqual([
            { projectId: null, seconds: 900 },
            { projectId: 1, seconds: 60 }
        ]);
    });

    it('ignores a running entry, which has no duration yet', () => {
        expect(groupTimeByProject([entry(null, 1)])).toEqual([]);
    });

    it('ignores a zero-length entry rather than listing a project at 0s', () => {
        expect(groupTimeByProject([entry(0, 1)])).toEqual([]);
    });

    it('returns nothing for a day with no entries', () => {
        expect(groupTimeByProject([])).toEqual([]);
    });
});

describe('totalTimeSeconds', () => {
    it('matches what the groups add up to', () => {
        const entries = [entry(600, 1), entry(3600, 2), entry(null, 2), entry(900)];

        const grouped = groupTimeByProject(entries).reduce((sum, g) => sum + g.seconds, 0);

        expect(totalTimeSeconds(entries)).toBe(5100);
        expect(totalTimeSeconds(entries)).toBe(grouped);
    });

    it('is zero for a day with nothing logged', () => {
        expect(totalTimeSeconds([])).toBe(0);
    });
});

const habit = (id: number, frequency: number, range: number, archived = false): HabitRead =>
    ({ id, name: `habit ${id}`, frequency, range, archived }) as HabitRead;

const completedOn = (habitId: number, dated: string): TrackerRead =>
    ({
        id: habitId * 1000 + Number(dated.slice(-2)),
        habit_id: habitId,
        dated,
        status: TrackerStatus.COMPLETED
    }) as TrackerRead;

describe('habitsExpectedOn', () => {
    it('counts a daily habit every day', () => {
        const daily = [habit(1, 1, 1)];

        expect(habitsExpectedOn(daily, [completedOn(1, '2026-09-13')], '2026-09-14')).toBe(1);
    });

    it('drops a monthly habit already kept inside its window', () => {
        // The case from the brief: four habits, the monthly one satisfied a
        // week ago, so the day asked for three.
        const habits = [habit(1, 1, 1), habit(2, 1, 1), habit(3, 1, 1), habit(4, 1, 30)];

        expect(habitsExpectedOn(habits, [completedOn(4, '2026-09-07')], '2026-09-14')).toBe(3);
    });

    it('counts the monthly habit again once its window has passed', () => {
        const habits = [habit(4, 1, 30)];

        expect(habitsExpectedOn(habits, [completedOn(4, '2026-07-01')], '2026-09-14')).toBe(1);
    });

    it('still expects a habit on the day it was kept', () => {
        // Auto-skip counts completions strictly before the day, so today's
        // own completion cannot excuse today.
        const habits = [habit(4, 1, 30)];

        expect(habitsExpectedOn(habits, [completedOn(4, '2026-09-14')], '2026-09-14')).toBe(1);
    });

    it('leaves archived habits out whatever their history', () => {
        const habits = [habit(1, 1, 1), habit(2, 1, 1, true)];

        expect(habitsExpectedOn(habits, [], '2026-09-14')).toBe(1);
    });

    it('does not let one habit auto-skip another', () => {
        const habits = [habit(1, 1, 30), habit(2, 1, 30)];

        expect(habitsExpectedOn(habits, [completedOn(1, '2026-09-07')], '2026-09-14')).toBe(1);
    });

    it('is zero for a profile with no habits', () => {
        expect(habitsExpectedOn([], [], '2026-09-14')).toBe(0);
    });
});

const task = (closed: string | null): TaskRead => ({ id: 1, closed_date: closed }) as TaskRead;

describe('closedOnCreationDay', () => {
    it('is false for a task that is still open', () => {
        expect(closedOnCreationDay(task(null), '2026-09-14')).toBe(false);
    });

    it('is true for a task closed on the day in question', () => {
        expect(closedOnCreationDay(task('2026-09-14T12:00:00'), '2026-09-14')).toBe(true);
    });

    it('is false for a task closed on a later day', () => {
        expect(closedOnCreationDay(task('2026-09-16T12:00:00'), '2026-09-14')).toBe(false);
    });

    it('reads the stamp in local time, not as UTC text', () => {
        // Midday UTC is the same local day in every zone this runs in, while
        // a naive string compare would agree for the wrong reason; the pair
        // below is what separates them west of UTC.
        expect(closedOnCreationDay(task('2026-09-15T02:00:00'), '2026-09-14')).toBe(
            new Date(Date.UTC(2026, 8, 15, 2)).getDate() === 14
        );
    });
});
