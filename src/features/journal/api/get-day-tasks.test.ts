import { TasksService, type TaskRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { localDayUtcBounds } from '@/lib/date-utils';
import { getDayTasks } from './get-day-tasks';

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
        const { closedFrom, closedTo } = localDayUtcBounds('2026-09-14');

        await getDayTasks(7, '2026-09-14');

        const call = spy.mock.calls[0]!;
        expect(call[8]).toBe(closedFrom);
        expect(call[9]).toBe(closedTo);
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
