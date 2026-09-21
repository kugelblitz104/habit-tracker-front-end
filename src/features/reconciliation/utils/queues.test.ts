import { describe, expect, it } from 'vitest';

import { makeHabit, makeProject, makeTask } from '@/test-support/factories';
import { TaskStatus } from '@/types/types';

import {
    DEFAULT_STALE_HABIT_DAYS,
    DEFAULT_STALE_PROJECT_DAYS,
    DEFAULT_STALE_TASK_DAYS,
    STRUGGLING_HABIT_RATE,
    orphanedSubtasks,
    quietProjects,
    staleTasks,
    strugglingHabits,
    windowsFromProfile
} from './queues';

// Fixed "now" so no test reads the clock, matching compute-band.test.ts.
const NOW = new Date('2026-09-16T12:00:00Z');

/** A naive UTC stamp `n` days before NOW, the shape the API returns. */
const daysAgo = (n: number): string =>
    new Date(NOW.getTime() - n * 86_400_000).toISOString().replace('Z', '');

describe('staleTasks', () => {
    it('flags an active top-level task untouched for longer than the window', () => {
        const task = makeTask({ created_date: daysAgo(200), updated_date: daysAgo(90) });

        expect(staleTasks([task], 60, NOW)).toEqual([task]);
    });

    it('spares a task touched inside the window', () => {
        // The Keep exit: an empty PATCH bumps updated_date, which is the only
        // thing that moves a row out of this queue.
        const task = makeTask({ created_date: daysAgo(200), updated_date: daysAgo(10) });

        expect(staleTasks([task], 60, NOW)).toEqual([]);
    });

    it('falls back to created_date when updated_date is null', () => {
        // updated_date is only set on update, so a never-edited task has none -
        // and it is exactly the row this queue exists to find.
        const task = makeTask({ created_date: daysAgo(90), updated_date: null });

        expect(staleTasks([task], 60, NOW)).toEqual([task]);
    });

    it('excludes subtasks, which are the orphan queue’s business', () => {
        const subtask = makeTask({
            parent_id: 7,
            created_date: daysAgo(200),
            updated_date: daysAgo(200)
        });

        expect(staleTasks([subtask], 60, NOW)).toEqual([]);
    });

    it('excludes done and cancelled tasks', () => {
        const stamps = { created_date: daysAgo(200), updated_date: daysAgo(200) };
        const done = makeTask({ ...stamps, status: TaskStatus.DONE });
        const cancelled = makeTask({ ...stamps, status: TaskStatus.CANCELLED });

        expect(staleTasks([done, cancelled], 60, NOW)).toEqual([]);
    });

    it('includes a deferred task', () => {
        // Deliberate, and the opposite of the Soon-fill rule: a task deferred
        // and never revisited is precisely the graveyard this page clears.
        const task = makeTask({
            status: TaskStatus.DEFERRED,
            created_date: daysAgo(200),
            updated_date: daysAgo(200)
        });

        expect(staleTasks([task], 60, NOW)).toEqual([task]);
    });

    it('moves a row in and out as the window changes', () => {
        const task = makeTask({ created_date: daysAgo(45), updated_date: daysAgo(45) });

        expect(staleTasks([task], 30, NOW)).toEqual([task]);
        expect(staleTasks([task], 60, NOW)).toEqual([]);
    });
});

describe('quietProjects', () => {
    const quiet = { created_date: daysAgo(400), updated_date: daysAgo(400) };

    it('flags a project with nothing closed inside the window', () => {
        const project = makeProject({ id: 1, archived: false, ...quiet });

        expect(quietProjects([project], [], 180, NOW)).toEqual([project]);
    });

    it('spares a project with a task closed inside the window', () => {
        const project = makeProject({ id: 1, archived: false, ...quiet });
        const closed = makeTask({
            project_id: 1,
            status: TaskStatus.DONE,
            closed_date: daysAgo(10)
        });

        expect(quietProjects([project], [closed], 180, NOW)).toEqual([]);
    });

    it('still flags a project whose only closure predates the window', () => {
        const project = makeProject({ id: 1, archived: false, ...quiet });
        const closed = makeTask({
            project_id: 1,
            status: TaskStatus.DONE,
            closed_date: daysAgo(300)
        });

        expect(quietProjects([project], [closed], 180, NOW)).toEqual([project]);
    });

    it('flags a project carrying open tasks', () => {
        // open_count is deliberately NOT a gate: a project with twelve open
        // tasks and no closures is a more convincing graveyard than an empty one.
        const project = makeProject({ id: 1, archived: false, open_count: 12, ...quiet });

        expect(quietProjects([project], [], 180, NOW)).toEqual([project]);
    });

    it('excludes an already-archived project', () => {
        const project = makeProject({ id: 1, archived: true, ...quiet });

        expect(quietProjects([project], [], 180, NOW)).toEqual([]);
    });

    it('spares a project touched inside the window', () => {
        const project = makeProject({
            id: 1,
            archived: false,
            created_date: daysAgo(400),
            updated_date: daysAgo(10)
        });

        expect(quietProjects([project], [], 180, NOW)).toEqual([]);
    });

    it('ignores a closure in a different project', () => {
        const project = makeProject({ id: 1, archived: false, ...quiet });
        const elsewhere = makeTask({
            project_id: 2,
            status: TaskStatus.DONE,
            closed_date: daysAgo(1)
        });

        expect(quietProjects([project], [elsewhere], 180, NOW)).toEqual([project]);
    });
});

describe('strugglingHabits', () => {
    const old = { created_date: daysAgo(400), updated_date: daysAgo(400) };

    it('flags a habit under the rate threshold', () => {
        const habit = makeHabit({ archived: false, ...old });

        expect(strugglingHabits([{ habit, completionRate: 4 }], 30, NOW)).toEqual([habit]);
    });

    it('spares a habit at the rate threshold', () => {
        const habit = makeHabit({ archived: false, ...old });

        expect(
            strugglingHabits([{ habit, completionRate: STRUGGLING_HABIT_RATE }], 30, NOW)
        ).toEqual([]);
    });

    it('excludes an already-archived habit', () => {
        const habit = makeHabit({ archived: true, ...old });

        expect(strugglingHabits([{ habit, completionRate: 4 }], 30, NOW)).toEqual([]);
    });

    it('never flags a habit younger than the window', () => {
        // No separate age gate is needed: "untouched for the window" already
        // implies created_date is at least a window old, because updated_date
        // is never earlier than created_date.
        const habit = makeHabit({
            archived: false,
            created_date: daysAgo(10),
            updated_date: null
        });

        expect(strugglingHabits([{ habit, completionRate: 0 }], 30, NOW)).toEqual([]);
    });

    it('spares a habit touched inside the window', () => {
        const habit = makeHabit({
            archived: false,
            created_date: daysAgo(400),
            updated_date: daysAgo(5)
        });

        expect(strugglingHabits([{ habit, completionRate: 4 }], 30, NOW)).toEqual([]);
    });

    it('moves a habit in and out as the window changes', () => {
        const habit = makeHabit({
            archived: false,
            created_date: daysAgo(45),
            updated_date: daysAgo(45)
        });

        expect(strugglingHabits([{ habit, completionRate: 4 }], 30, NOW)).toEqual([habit]);
        expect(strugglingHabits([{ habit, completionRate: 4 }], 90, NOW)).toEqual([]);
    });
});

describe('orphanedSubtasks', () => {
    it('flags an active subtask whose parent is closed', () => {
        const parent = makeTask({ id: 1, status: TaskStatus.DONE, closed_date: daysAgo(30) });
        const subtask = makeTask({
            parent_id: 1,
            created_date: daysAgo(60),
            updated_date: daysAgo(60)
        });

        expect(orphanedSubtasks([subtask], [parent])).toEqual([subtask]);
    });

    it('spares a subtask whose parent is still active', () => {
        const subtask = makeTask({
            parent_id: 1,
            created_date: daysAgo(60),
            updated_date: daysAgo(60)
        });

        expect(orphanedSubtasks([subtask], [])).toEqual([]);
    });

    it('spares a subtask touched after its parent closed', () => {
        // The Keep exit, and it needs no window: "I have looked at this since
        // its parent closed" is the whole rule.
        const parent = makeTask({ id: 1, status: TaskStatus.DONE, closed_date: daysAgo(30) });
        const subtask = makeTask({
            parent_id: 1,
            created_date: daysAgo(60),
            updated_date: daysAgo(5)
        });

        expect(orphanedSubtasks([subtask], [parent])).toEqual([]);
    });

    it('falls back to created_date when the subtask was never edited', () => {
        const parent = makeTask({ id: 1, status: TaskStatus.DONE, closed_date: daysAgo(30) });
        const subtask = makeTask({ parent_id: 1, created_date: daysAgo(60), updated_date: null });

        expect(orphanedSubtasks([subtask], [parent])).toEqual([subtask]);
    });

    it('excludes a subtask that is itself closed', () => {
        const parent = makeTask({ id: 1, status: TaskStatus.DONE, closed_date: daysAgo(30) });
        const subtask = makeTask({
            parent_id: 1,
            status: TaskStatus.CANCELLED,
            created_date: daysAgo(60),
            updated_date: daysAgo(60)
        });

        expect(orphanedSubtasks([subtask], [parent])).toEqual([]);
    });

    it('excludes a top-level task', () => {
        const task = makeTask({ parent_id: null, created_date: daysAgo(60) });

        expect(orphanedSubtasks([task], [])).toEqual([]);
    });
});

describe('defaults', () => {
    it('are the values the entry screen falls back to when the profile is unset', () => {
        expect(DEFAULT_STALE_TASK_DAYS).toBe(60);
        expect(DEFAULT_STALE_PROJECT_DAYS).toBe(180);
        expect(DEFAULT_STALE_HABIT_DAYS).toBe(30);
        expect(STRUGGLING_HABIT_RATE).toBe(20);
    });
});

describe('windowsFromProfile', () => {
    it('uses the profile’s stored windows when set', () => {
        expect(
            windowsFromProfile({
                reconciliation_stale_task_days: 90,
                reconciliation_stale_project_days: 365,
                reconciliation_stale_habit_days: 56
            })
        ).toEqual({ staleTaskDays: 90, staleProjectDays: 365, staleHabitDays: 56 });
    });

    it('falls back to the defaults for each unset window', () => {
        // The columns are nullable with no server default, so null means "use
        // the client's default" - a profile that has never opened the page
        // behaves exactly as an unconfigurable one would.
        expect(windowsFromProfile({ reconciliation_stale_task_days: 90 })).toEqual({
            staleTaskDays: 90,
            staleProjectDays: DEFAULT_STALE_PROJECT_DAYS,
            staleHabitDays: DEFAULT_STALE_HABIT_DAYS
        });
    });

    it('falls back for a missing profile entirely', () => {
        expect(windowsFromProfile(null)).toEqual({
            staleTaskDays: DEFAULT_STALE_TASK_DAYS,
            staleProjectDays: DEFAULT_STALE_PROJECT_DAYS,
            staleHabitDays: DEFAULT_STALE_HABIT_DAYS
        });
    });
});
