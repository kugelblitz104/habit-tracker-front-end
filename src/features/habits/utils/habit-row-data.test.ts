import { describe, expect, it } from 'vitest';
import type { HabitRead } from '@/api';
import { DisplayStatus, TrackerStatus } from '@/types/types';
import { buildHabitRowData, countHabitsLeft, countHabitsLeftFromFlags } from './habit-row-data';

const habit = (over: Partial<HabitRead> = {}): HabitRead =>
    ({
        id: 1,
        name: 'Stretch',
        question: '',
        color: '#7fa8c9',
        frequency: 1,
        range: 1,
        reminder: false,
        notes: null,
        archived: false,
        sort_order: 0,
        category: null,
        profile_id: 1,
        created_date: '2026-01-01T00:00:00',
        updated_date: '2026-01-01T00:00:00',
        completed_today: false,
        skipped_today: false,
        slug: 'stretch',
        ...over
    }) as HabitRead;

const TODAY = new Date(2026, 8, 21);

describe('buildHabitRowData', () => {
    it('reads auto-skip from the batch entry rather than recomputing it', () => {
        const rows = buildHabitRowData(
            [habit({ id: 1, frequency: 2, range: 7 })],
            new Map([
                [
                    1,
                    {
                        habit_id: 1,
                        trackers: [],
                        end_date: '2026-09-21',
                        days: 7,
                        has_previous: false,
                        auto_skipped_dates: ['2026-09-21']
                    }
                ]
            ]),
            new Map(),
            TODAY
        );

        expect(rows.get(1)!.status).toBe(DisplayStatus.AUTO_SKIPPED);
    });

    it('leaves auto-skip undefined when the entry is missing, so the local fallback runs', () => {
        const rows = buildHabitRowData([habit()], new Map(), new Map(), TODAY);

        expect(rows.get(1)!.autoSkippedDates).toBeUndefined();
        expect(rows.get(1)!.trackers).toEqual([]);
    });

    it('takes the streak from the KPI batch and defaults to 0', () => {
        const rows = buildHabitRowData(
            [habit({ id: 1 }), habit({ id: 2 })],
            new Map(),
            new Map([[1, { current_streak: 4 } as never]]),
            TODAY
        );

        expect(rows.get(1)!.streak).toBe(4);
        expect(rows.get(2)!.streak).toBe(0);
    });
});

describe('countHabitsLeft', () => {
    it('counts non-archived habits that are not completed and not auto-skipped', () => {
        const habits = [
            habit({ id: 1 }),
            habit({ id: 2 }),
            habit({ id: 3 }),
            habit({ id: 4, archived: true }),
            habit({ id: 5 })
        ];
        const rows = buildHabitRowData(
            habits,
            new Map([
                [
                    2,
                    {
                        habit_id: 2,
                        trackers: [
                            {
                                id: 9,
                                dated: '2026-09-21',
                                status: TrackerStatus.COMPLETED,
                                has_note: false
                            }
                        ],
                        end_date: '2026-09-21',
                        days: 1,
                        has_previous: false,
                        auto_skipped_dates: []
                    }
                ],
                [
                    3,
                    {
                        habit_id: 3,
                        trackers: [],
                        end_date: '2026-09-21',
                        days: 1,
                        has_previous: false,
                        auto_skipped_dates: ['2026-09-21']
                    }
                ],
                [
                    5,
                    {
                        habit_id: 5,
                        trackers: [
                            {
                                id: 10,
                                dated: '2026-09-21',
                                status: TrackerStatus.SKIPPED,
                                has_note: false
                            }
                        ],
                        end_date: '2026-09-21',
                        days: 1,
                        has_previous: false,
                        auto_skipped_dates: []
                    }
                ]
            ]),
            new Map(),
            TODAY
        );

        // 1 is outstanding; 2 is completed; 3 is auto-skipped; 4 is archived; 5 is manually skipped.
        expect(rows.get(5)!.status).toBe(DisplayStatus.SKIPPED);
        expect(countHabitsLeft(habits, rows)).toBe(2);
    });
});

describe('countHabitsLeftFromFlags', () => {
    it('counts from HabitRead alone, so the header has a figure before the batch lands', () => {
        const habits = [
            habit({ id: 1 }),
            habit({ id: 2, completed_today: true }),
            habit({ id: 3, skipped_today: true }),
            habit({ id: 4, archived: true }),
            habit({ id: 5 })
        ];

        expect(countHabitsLeftFromFlags(habits)).toBe(2);
        // Without it the header would read every habit as outstanding: the
        // exact count over empty rowData says 4.
        expect(
            countHabitsLeft(habits, buildHabitRowData(habits, new Map(), new Map(), TODAY))
        ).toBe(4);
    });
});
