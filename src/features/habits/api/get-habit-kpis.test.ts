import { HabitsService } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHabitsKpis } from './get-habit-kpis';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getHabitsKpis', () => {
    it('walks every page and returns one entry per habit', async () => {
        const page = vi
            .spyOn(HabitsService, 'listHabitsKpisHabitsKpisGet')
            .mockResolvedValueOnce({
                items: [{ habit_id: 1, kpis: {} }],
                total: 2,
                limit: 100,
                offset: 0
            } as never)
            .mockResolvedValueOnce({
                items: [{ habit_id: 2, kpis: {} }],
                total: 2,
                limit: 100,
                offset: 1
            } as never);

        const entries = await getHabitsKpis({ profileId: 3 });

        expect(entries.map((e) => e.habit_id)).toEqual([1, 2]);
        expect(page).toHaveBeenCalledTimes(2);
    });

    it('de-duplicates a habit an offset walk repeated', async () => {
        vi.spyOn(HabitsService, 'listHabitsKpisHabitsKpisGet')
            .mockResolvedValueOnce({
                items: [{ habit_id: 1, kpis: {} }],
                total: 2,
                limit: 100,
                offset: 0
            } as never)
            .mockResolvedValueOnce({
                items: [{ habit_id: 1, kpis: {} }],
                total: 2,
                limit: 100,
                offset: 1
            } as never);

        const entries = await getHabitsKpis({ profileId: 3 });

        expect(entries).toHaveLength(1);
    });
});
