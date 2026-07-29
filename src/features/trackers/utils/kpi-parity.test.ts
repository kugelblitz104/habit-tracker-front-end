import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeHabit, makeTrackerLite } from '@/test-support/factories';
import parityDoc from '@/test-support/kpi-parity-cases.json';

import { adaptKpisToServerShape, adaptStreaksToServerShape } from './kpi-adapter';
import { calculateStreaks, getCurrentStreakLength, getEffectiveStartDate } from './kpi-utils';

/**
 * Cross-repo parity for the habit KPI math.
 *
 * `kpi-utils.ts` and `kpi-adapter.ts` deliberately re-implement the backend's
 * `services/habit_stats.py` so a habit toggle can patch the `['kpis']` /
 * `['streaks']` caches optimistically. The cases live in a single committed file,
 * `src/test-support/kpi-parity-cases.json`, which the backend's
 * `tests/test_habit_stats.py` reads too — so drift on either side turns one of the
 * two suites red. Never edit that JSON without re-running both.
 *
 * `expected` holds the quantities the two implementations agree on. `divergent`
 * holds the ones they don't: each side asserts its OWN recorded value, so the
 * disagreement is pinned rather than papered over, and `_divergences` in the JSON
 * names the defect. Fixing one moves the quantity from `divergent` to `expected`.
 *
 * Unlike `habit_stats.py`, nothing in `kpi-utils` takes `today` as an argument —
 * it calls `new Date()` internally. So each case's `anchor_date` is pinned with
 * fake timers. No assertion here depends on the real clock.
 */

/** The quantities BOTH implementations compute, in the server's field names. */
type ParityQuantities = {
    effective_start_date: string;
    total_completions: number;
    current_streak: number;
    longest_streak: number;
    longest_streak_end_date: string | null;
    overall_completion_rate: number;
    thirty_day_completion_rate: number;
    last_completed_date: string | null;
    weekday_completion_rates: number[];
    streaks: { start_date: string; end_date: string; length: number }[];
};

type QuantityKey = keyof ParityQuantities;

type Divergence = { backend: unknown; frontend: unknown; bugs: string[] };

type ParityCase = {
    name: string;
    anchor_date: string;
    habit: { id: number; frequency: number; range: number; created_date: string };
    trackers: { dated: string; status: number }[];
    expected: Partial<ParityQuantities>;
    divergent?: Partial<Record<QuantityKey, Divergence>>;
};

const doc = parityDoc as unknown as {
    _divergences: Record<string, string>;
    cases: ParityCase[];
};

/** Every case must pin all ten, split across `expected` and `divergent`. */
const QUANTITY_KEYS: QuantityKey[] = [
    'effective_start_date',
    'total_completions',
    'current_streak',
    'longest_streak',
    'longest_streak_end_date',
    'overall_completion_rate',
    'thirty_day_completion_rate',
    'last_completed_date',
    'weekday_completion_rates',
    'streaks'
];

/** Rates are compared with a tolerance; everything else is exact. */
const FLOAT_KEYS = new Set<QuantityKey>([
    'overall_completion_rate',
    'thirty_day_completion_rate',
    'weekday_completion_rates'
]);

/**
 * Make the case's `anchor_date` the module's "today". Built with the local-time
 * Date ctor at midday so the suite is timezone-agnostic — `toLocalDateString`
 * reads local fields, and midday leaves room for any DST shift.
 */
const pinToday = (anchorDate: string): void => {
    const [year, month, day] = anchorDate.split('-').map(Number) as [number, number, number];
    vi.setSystemTime(new Date(year, month - 1, day, 12, 0, 0));
};

const computeQuantities = (parityCase: ParityCase): ParityQuantities => {
    const habit = makeHabit({
        id: parityCase.habit.id,
        frequency: parityCase.habit.frequency,
        range: parityCase.habit.range,
        created_date: parityCase.habit.created_date
    });
    const trackers = parityCase.trackers.map((tracker, index) =>
        makeTrackerLite({ id: index + 1, dated: tracker.dated, status: tracker.status })
    );

    const kpis = adaptKpisToServerShape(habit, trackers);

    return {
        effective_start_date: getEffectiveStartDate(trackers, habit.created_date),
        total_completions: kpis.total_completions,
        current_streak: kpis.current_streak,
        longest_streak: kpis.longest_streak,
        longest_streak_end_date: kpis.longest_streak_end_date ?? null,
        overall_completion_rate: kpis.overall_completion_rate,
        thirty_day_completion_rate: kpis.thirty_day_completion_rate,
        last_completed_date: kpis.last_completed_date ?? null,
        weekday_completion_rates: kpis.weekday_completion_rates,
        streaks: adaptStreaksToServerShape(habit, trackers)
    };
};

const expectQuantity = (key: QuantityKey, got: unknown, want: unknown, bugs?: string[]): void => {
    const label = bugs ? `${key} [known divergence: ${bugs.join(', ')}]` : key;
    expect(want, `${key} is not pinned by this case`).not.toBeUndefined();

    if (key === 'weekday_completion_rates') {
        const wants = want as number[];
        const gots = got as number[];
        expect(gots, label).toHaveLength(wants.length);
        wants.forEach((rate, index) =>
            expect(gots[index], `${label}[${index}]`).toBeCloseTo(rate, 12)
        );
        return;
    }
    if (FLOAT_KEYS.has(key)) {
        expect(got as number, label).toBeCloseTo(want as number, 12);
        return;
    }
    expect(got, label).toEqual(want);
};

beforeEach(() => {
    // Only Date — the KPI modules use no timers, and faking them all would
    // silently swallow anything else the runner schedules.
    vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('kpi parity case file', () => {
    it('has cases', () => {
        expect(doc.cases.length).toBeGreaterThan(0);
    });

    it('pins every shared quantity exactly once per case', () => {
        const wanted = [...QUANTITY_KEYS].sort();
        for (const parityCase of doc.cases) {
            const pinned = [
                ...Object.keys(parityCase.expected),
                ...Object.keys(parityCase.divergent ?? {})
            ].sort();
            expect(pinned, parityCase.name).toEqual(wanted);
        }
    });

    it('only cites divergences the file documents', () => {
        const documented = Object.keys(doc._divergences);
        for (const parityCase of doc.cases) {
            for (const [key, divergence] of Object.entries(parityCase.divergent ?? {})) {
                expect(divergence.bugs, `${parityCase.name} / ${key}`).not.toHaveLength(0);
                for (const bug of divergence.bugs) {
                    expect(documented, `${parityCase.name} / ${key}`).toContain(bug);
                }
            }
        }
    });
});

describe('kpi parity with the backend', () => {
    for (const parityCase of doc.cases) {
        it(parityCase.name, () => {
            pinToday(parityCase.anchor_date);
            const actual = computeQuantities(parityCase);

            for (const key of QUANTITY_KEYS) {
                const divergence = parityCase.divergent?.[key];
                const want = divergence ? divergence.frontend : parityCase.expected[key];
                expectQuantity(key, actual[key], want, divergence?.bugs);
            }
        });
    }
});

describe('kpi-utils exports agree with the adapter that wraps them', () => {
    // `adaptKpisToServerShape` reaches `getCurrentStreakLength`/`calculateStreaks`
    // indirectly, so call them straight to keep those exports pinned too.
    for (const parityCase of doc.cases) {
        it(parityCase.name, () => {
            pinToday(parityCase.anchor_date);
            const habit = makeHabit({
                frequency: parityCase.habit.frequency,
                range: parityCase.habit.range,
                created_date: parityCase.habit.created_date
            });
            const trackers = parityCase.trackers.map((tracker, index) =>
                makeTrackerLite({ id: index + 1, dated: tracker.dated, status: tracker.status })
            );

            const streaks = calculateStreaks(
                trackers,
                habit.frequency,
                habit.range,
                habit.created_date
            );
            const expectedStreaks =
                parityCase.expected.streaks ??
                (parityCase.divergent?.streaks?.frontend as ParityQuantities['streaks']);
            const expectedCurrent =
                parityCase.expected.current_streak ??
                (parityCase.divergent?.current_streak?.frontend as number);

            expect(
                streaks.map((s) => ({
                    start_date: s.startDate,
                    end_date: s.endDate,
                    length: s.length
                }))
            ).toEqual(expectedStreaks);
            expect(getCurrentStreakLength(streaks)).toBe(expectedCurrent);
        });
    }
});
