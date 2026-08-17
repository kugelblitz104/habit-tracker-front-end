import { HabitsService, type HabitRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHabits } from './get-habits';

const habit = (id: number) => ({ id, name: `Habit ${id}` }) as HabitRead;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getHabits', () => {
    it('walks every page so Today and the dashboard see all habits', async () => {
        const total = 220;
        const spy = vi.spyOn(HabitsService, 'listHabitsHabitsGet').mockImplementation((async (
            _profileId: number,
            limit: number,
            _tz: string | null,
            offset: number
        ) => ({
            habits: Array.from({ length: Math.min(limit, total - (offset ?? 0)) }, (_, i) =>
                habit((offset ?? 0) + i)
            ),
            total,
            limit,
            offset: offset ?? 0
        })) as never);

        const result = await getHabits(1);

        expect(result.habits).toHaveLength(total);
        expect(spy).toHaveBeenCalledTimes(3);
        // tz must be sent on every request, or completed_today flips to the
        // server's day partway through the list.
        expect(spy.mock.calls.every((call) => typeof call[2] === 'string')).toBe(true);
    });
});
