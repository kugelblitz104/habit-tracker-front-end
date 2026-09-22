import type { HabitKPIs, HabitKPIsEntry, HabitRead, HabitTrackersLite, TrackerLite } from '@/api';
import { toLocalDateString } from '@/lib/date-utils';
import { TrackerStatus } from '@/types/types';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { patchHabitTrackersBatch, reconcileHabitKpis } from './habit-kpi-cache';

const HABIT_ID = 7;
/** The dashboard's widest rendered window (DASHBOARD_DAYS_BY_SIZE.xl). */
const WINDOW_DAYS = 14;
/** Longer than the window, which is the whole point of these tests. */
const SERVER_STREAK = 31;

const daysAgo = (n: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return toLocalDateString(date);
};

const TODAY = daysAgo(0);

const habit: HabitRead = {
    id: HABIT_ID,
    name: 'Daily habit',
    question: '',
    color: '#7fa8c9',
    frequency: 1,
    range: 1,
    profile_id: 1,
    created_date: `${daysAgo(120)}T00:00:00`,
    slug: 'daily-habit'
};

const serverKpis: HabitKPIs = {
    total_completions: 44,
    current_streak: SERVER_STREAK,
    longest_streak: SERVER_STREAK,
    longest_streak_end_date: TODAY,
    thirty_day_completion_rate: 1,
    overall_completion_rate: 0.9,
    last_completed_date: TODAY,
    weekday_completion_rates: [1, 1, 1, 1, 1, 1, 1]
};

const trackersBatchKey = ['habits-trackers-lite', { profileId: 1, days: WINDOW_DAYS }];
const kpisBatchKey = ['habits-kpis', { profileId: 1, archived: undefined }];
const perHabitKpisKey = ['kpis', { habitId: HABIT_ID }];

/**
 * A client holding what the dashboard holds mid-session: a trackers batch
 * carrying only the rendered window, and a KPI batch carrying the server's
 * full-history figures.
 */
const seedDashboardCache = () => {
    const client = new QueryClient();
    // The window, minus today: the click under test completes today.
    const trackers: TrackerLite[] = Array.from({ length: WINDOW_DAYS - 1 }, (_, i) => ({
        id: 100 + i,
        dated: daysAgo(i + 1),
        status: TrackerStatus.COMPLETED,
        has_note: false
    }));

    client.setQueryData<HabitTrackersLite[]>(trackersBatchKey, [
        {
            habit_id: HABIT_ID,
            trackers,
            end_date: TODAY,
            days: WINDOW_DAYS,
            auto_skipped_dates: []
        }
    ]);
    client.setQueryData<HabitKPIsEntry[]>(kpisBatchKey, [
        { habit_id: HABIT_ID, kpis: { ...serverKpis } }
    ]);
    return client;
};

const completeToday = (prev: TrackerLite[]): TrackerLite[] => [
    ...prev,
    { id: -1, dated: TODAY, status: TrackerStatus.COMPLETED, has_note: false }
];

const batchKpis = (client: QueryClient): HabitKPIs =>
    client.getQueryData<HabitKPIsEntry[]>(kpisBatchKey)![0]!.kpis;

describe('patchHabitTrackersBatch', () => {
    it('adds the row to the trackers batch', () => {
        const client = seedDashboardCache();

        patchHabitTrackersBatch(client, HABIT_ID, completeToday);

        const entry = client.getQueryData<HabitTrackersLite[]>(trackersBatchKey)![0]!;
        expect(entry.trackers).toHaveLength(WINDOW_DAYS);
        expect(entry.trackers!.at(-1)!.dated).toBe(TODAY);
    });

    it('leaves another habit alone', () => {
        const client = seedDashboardCache();

        patchHabitTrackersBatch(client, HABIT_ID + 1, completeToday);

        const entry = client.getQueryData<HabitTrackersLite[]>(trackersBatchKey)![0]!;
        expect(entry.trackers).toHaveLength(WINDOW_DAYS - 1);
        expect(batchKpis(client).current_streak).toBe(SERVER_STREAK);
    });

    it('does not touch KPI figures, so the streak cannot flash a window-derived value', () => {
        // The case that makes window-derived KPIs visibly wrong: an 8-day run
        // and a 9-day run separated by one empty day. Completing that day joins
        // them into 18, but a 14-day window can only ever report 14, so a patch
        // computed from it would render 8 -> 14 -> 18.
        const client = new QueryClient();
        const gapDay = daysAgo(9);
        // Days 1-8 and 10-13 completed, day 9 empty. The older run continues
        // past the window's edge, which is why the server says 18 and the
        // window cannot.
        const trackers: TrackerLite[] = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13].map((i) => ({
            id: 200 + i,
            dated: daysAgo(i),
            status: TrackerStatus.COMPLETED,
            has_note: false
        }));
        client.setQueryData<HabitTrackersLite[]>(trackersBatchKey, [
            { habit_id: HABIT_ID, trackers, end_date: TODAY, days: WINDOW_DAYS }
        ]);
        client.setQueryData<HabitKPIsEntry[]>(kpisBatchKey, [
            { habit_id: HABIT_ID, kpis: { ...serverKpis, current_streak: 8 } }
        ]);

        patchHabitTrackersBatch(client, HABIT_ID, (prev) => [
            ...prev,
            { id: -1, dated: gapDay, status: TrackerStatus.COMPLETED, has_note: false }
        ]);

        // The cell repaints, the streak holds its pre-write value.
        expect(
            client
                .getQueryData<HabitTrackersLite[]>(trackersBatchKey)![0]!
                .trackers!.some((t) => t.dated === gapDay)
        ).toBe(true);
        expect(batchKpis(client).current_streak).toBe(8);
        expect(batchKpis(client)).toEqual({ ...serverKpis, current_streak: 8 });
    });
});

describe('reconcileHabitKpis', () => {
    it('is what moves the streak after a write, since the patch leaves it alone', async () => {
        const client = seedDashboardCache();
        const before = { ...serverKpis, current_streak: 8 };
        client.setQueryData<HabitKPIsEntry[]>(kpisBatchKey, [{ habit_id: HABIT_ID, kpis: before }]);

        patchHabitTrackersBatch(client, HABIT_ID, completeToday);

        // Nothing has moved the streak yet: the cell has repainted, the number
        // still reads what the server last said.
        expect(batchKpis(client)).toEqual(before);

        await reconcileHabitKpis(client, HABIT_ID, async () => serverKpis);

        expect(batchKpis(client).current_streak).toBe(SERVER_STREAK);
        expect(batchKpis(client).total_completions).toBe(serverKpis.total_completions);
        expect(client.getQueryData<HabitKPIs>(perHabitKpisKey)).toEqual(serverKpis);
    });

    it('makes no request when no cached batch holds the habit', async () => {
        const client = new QueryClient();
        const fetchKpis = vi.fn(async () => serverKpis);

        await reconcileHabitKpis(client, HABIT_ID, fetchKpis);

        expect(fetchKpis).not.toHaveBeenCalled();
        expect(client.getQueryData(perHabitKpisKey)).toBeUndefined();
    });

    it('drops an earlier read that lands after a later one', async () => {
        const client = seedDashboardCache();
        const resolvers: ((kpis: HabitKPIs) => void)[] = [];
        const fetchKpis = () =>
            new Promise<HabitKPIs>((resolve) => {
                resolvers.push(resolve);
            });

        const first = reconcileHabitKpis(client, HABIT_ID, fetchKpis);
        const second = reconcileHabitKpis(client, HABIT_ID, fetchKpis);

        // The second click's answer arrives first; the first click's answer is
        // stale by the time it lands and must not overwrite it.
        resolvers[1]!({ ...serverKpis, current_streak: 2 });
        resolvers[0]!({ ...serverKpis, current_streak: 1 });
        await Promise.all([first, second]);

        expect(batchKpis(client).current_streak).toBe(2);
    });

    it('leaves the caches as they were when the read fails', async () => {
        const client = seedDashboardCache();
        patchHabitTrackersBatch(client, HABIT_ID, completeToday);
        const optimistic = batchKpis(client);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        await reconcileHabitKpis(client, HABIT_ID, async () => {
            throw new Error('offline');
        });

        expect(batchKpis(client)).toEqual(optimistic);
        expect(client.getQueryData(perHabitKpisKey)).toBeUndefined();
        consoleError.mockRestore();
    });
});
