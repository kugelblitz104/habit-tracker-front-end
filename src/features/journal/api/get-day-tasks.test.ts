import { TasksService, type TaskRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { localDayUtcBounds } from '@/lib/date-utils';
import { getDayCreatedTasks, getDayTasks } from './get-day-tasks';

const task = (id: number) => ({ id, title: `task ${id}` }) as TaskRead;

const mockList = (total: number) =>
    vi.spyOn(TasksService, 'listTasksTasksGet').mockImplementation((async (
        ..._args: unknown[]
    ) => ({
        tasks: Array.from({ length: Math.min(100, total) }, (_, i) => task(i + 1)),
        total
    })) as never);

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getDayTasks', () => {
    // Both of these return an empty list with no error when wrong, which is
    // why they are pinned rather than left to a manual check.
    it('asks for closed tasks, or the range can never match anything', async () => {
        const spy = mockList(1);

        await getDayTasks(7, '2026-09-14');

        expect(spy.mock.calls[0]![4]).toBe(true);
    });

    it('sends the local day as naive UTC bounds', async () => {
        const spy = mockList(1);
        const { from, to } = localDayUtcBounds('2026-09-14');

        await getDayTasks(7, '2026-09-14');

        const call = spy.mock.calls[0]!;
        expect(call[8]).toBe(from);
        expect(call[9]).toBe(to);
        expect(call[8]).not.toMatch(/Z$/);
    });

    it('walks every page, so a heavy day is not truncated at 100', async () => {
        const spy = mockList(150);

        const tasks = await getDayTasks(7, '2026-09-14');

        expect(spy).toHaveBeenCalledTimes(2);
        // Every page here repeats ids 1..100, so de-duplication must collapse
        // them rather than handing React duplicate keys.
        expect(new Set(tasks.map((row) => row.id)).size).toBe(tasks.length);
    });
});

describe('getDayCreatedTasks', () => {
    it('sends the day on the created bounds, leaving the closed ones unset', async () => {
        const spy = mockList(1);
        const { from, to } = localDayUtcBounds('2026-09-14');

        await getDayCreatedTasks(7, '2026-09-14');

        // The generated client passes positionally, so a created bound landing
        // in a closed slot would silently filter on the wrong column.
        const call = spy.mock.calls[0]!;
        expect(call[8]).toBeUndefined();
        expect(call[9]).toBeUndefined();
        expect(call[10]).toBe(from);
        expect(call[11]).toBe(to);
    });

    it('includes closed tasks, or a task raised and finished today vanishes', async () => {
        const spy = mockList(1);

        await getDayCreatedTasks(7, '2026-09-14');

        expect(spy.mock.calls[0]![4]).toBe(true);
    });

    it('walks every page', async () => {
        const spy = mockList(150);

        await getDayCreatedTasks(7, '2026-09-14');

        expect(spy).toHaveBeenCalledTimes(2);
    });
});
