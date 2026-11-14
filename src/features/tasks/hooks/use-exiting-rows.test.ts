import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { describe, expect, it } from 'vitest';
import { withHeldRows } from './use-exiting-rows';

const task = (id: number) => ({ id }) as TaskRead;
const ids = (tasks: TaskRead[]) => tasks.map((t) => t.id);
const held = (id: number, index: number) => ({
    task: task(id),
    index,
    status: TaskStatus.DONE
});

describe('withHeldRows', () => {
    it('returns the list untouched while the held row is still in it', () => {
        const tasks = [task(1), task(2), task(3)];
        expect(withHeldRows(tasks, [held(2, 1)])).toBe(tasks);
    });

    it('puts a dropped row back at its old index', () => {
        expect(ids(withHeldRows([task(1), task(3)], [held(2, 1)]))).toEqual([1, 2, 3]);
    });

    it('restores several dropped rows in index order and clamps past the end', () => {
        const rows = withHeldRows([task(2)], [held(4, 3), held(1, 0)]);
        expect(ids(rows)).toEqual([1, 2, 4]);
    });
});
