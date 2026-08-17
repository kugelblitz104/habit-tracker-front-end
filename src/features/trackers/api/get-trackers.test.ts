import { HabitsService, type TrackerLite } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTrackersLite } from './get-trackers';

const tracker = (id: number) =>
    ({ id, dated: '2026-01-01', status: 2, has_note: false }) as TrackerLite;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getTrackersLite', () => {
    it('walks the window in 1000-row pages and keeps every tracker', async () => {
        const total = 2500;
        const spy = vi
            .spyOn(HabitsService, 'listHabitTrackersLiteHabitsHabitIdTrackersLiteGet')
            .mockImplementation((async (
                _habitId: number,
                _endDate: string | null,
                days: number,
                _tz: string | null,
                limit: number,
                offset: number
            ) => ({
                trackers: Array.from(
                    { length: Math.max(Math.min(limit, total - (offset ?? 0)), 0) },
                    (_, i) => tracker((offset ?? 0) + i)
                ),
                total,
                end_date: '2026-01-01',
                days,
                has_previous: true,
                auto_skipped_dates: ['2025-12-25'],
                limit,
                offset: offset ?? 0
            })) as never);

        const result = await getTrackersLite(1, undefined, 3000);

        expect(result.trackers).toHaveLength(total);
        expect(spy).toHaveBeenCalledTimes(3);
        expect(spy.mock.calls.every((call) => call[4] === 1000)).toBe(true);
    });

    it('keeps the first page range fields across a multi-page walk, not the last', async () => {
        const total = 2500;
        const page0 = {
            end_date: '2026-01-01',
            days: 10,
            has_previous: false,
            auto_skipped_dates: ['2026-01-01']
        };
        const page1 = {
            end_date: '2026-02-02',
            days: 20,
            has_previous: true,
            auto_skipped_dates: ['2026-02-02']
        };
        const page2 = {
            end_date: '2026-03-03',
            days: 30,
            has_previous: false,
            auto_skipped_dates: ['2026-03-03']
        };
        vi.spyOn(
            HabitsService,
            'listHabitTrackersLiteHabitsHabitIdTrackersLiteGet'
        ).mockImplementation((async (
            _habitId: number,
            _endDate: string | null,
            _days: number,
            _tz: string | null,
            limit: number,
            offset: number
        ) => {
            const page = offset === 0 ? page0 : offset === 1000 ? page1 : page2;
            return {
                trackers: Array.from(
                    { length: Math.max(Math.min(limit, total - (offset ?? 0)), 0) },
                    (_, i) => tracker((offset ?? 0) + i)
                ),
                total,
                ...page,
                limit,
                offset: offset ?? 0
            };
        }) as never);

        const result = await getTrackersLite(1, '2026-02-02', 42);

        expect(result.end_date).toBe(page0.end_date);
        expect(result.days).toBe(page0.days);
        expect(result.has_previous).toBe(page0.has_previous);
        expect(result.auto_skipped_dates).toEqual(page0.auto_skipped_dates);
    });
});
