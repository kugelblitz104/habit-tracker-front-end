import { describe, expect, it } from 'vitest';

import { toLocalDateString } from '@/lib/date-utils';
import { makeTrackerLite } from '@/test-support/factories';
import { DisplayStatus, TrackerStatus } from '@/types/types';

import {
    createNewTracker,
    findTrackerByDate,
    getDisplayStatusForDate,
    getNextTrackerState,
    getTrackerDisplayStatus,
    isAutoSkipped,
    toLocalDateString as reExportedToLocalDateString
} from './tracker-utils';

/**
 * Pure tracker logic. `getTrackerIcon` and `NotePip` render JSX and are left to
 * the e2e suite — this file only covers the exported pure functions.
 *
 * Dates use the module's own worked example (frequency 1 / range 7, completed on
 * Wednesday 3 December 2025) so the cases line up with the doc comment on
 * `isAutoSkipped`. Every Date is built from local components, so the suite is
 * timezone-agnostic.
 */
const day = (dayOfMonth: number): Date => new Date(2025, 11, dayOfMonth);

/** A completed tracker on the given December 2025 day. */
const completedOn = (dayOfMonth: number) =>
    makeTrackerLite({ dated: toLocalDateString(day(dayOfMonth)), status: TrackerStatus.COMPLETED });

const WEEKLY = { frequency: 1, range: 7 };

describe('toLocalDateString re-export', () => {
    it('is the same function as the one in lib/date-utils', () => {
        // Kept only for backwards compatibility with older tracker imports.
        expect(reExportedToLocalDateString).toBe(toLocalDateString);
    });
});

describe('isAutoSkipped', () => {
    it('never auto-skips a daily habit, where every day has to be completed', () => {
        const trackers = [completedOn(3)];
        expect(isAutoSkipped(day(4), trackers, 1, 1)).toBe(false);
        expect(isAutoSkipped(day(4), trackers, 7, 7)).toBe(false);
        // frequency above range is nonsense but takes the same early return.
        expect(isAutoSkipped(day(4), trackers, 2, 1)).toBe(false);
    });

    it('auto-skips the day after a completion', () => {
        // Window for Dec 4 is Nov 28 - Dec 4 and contains the Dec 3 completion.
        expect(isAutoSkipped(day(4), [completedOn(3)], WEEKLY.frequency, WEEKLY.range)).toBe(true);
    });

    it('keeps auto-skipping to the far edge of the window', () => {
        // Window for Dec 9 is Dec 3 - Dec 9: the completion is the first day in.
        expect(isAutoSkipped(day(9), [completedOn(3)], WEEKLY.frequency, WEEKLY.range)).toBe(true);
    });

    it('stops auto-skipping once the completion falls out of the window', () => {
        // Window for Dec 10 is Dec 4 - Dec 10: the Dec 3 completion is gone.
        expect(isAutoSkipped(day(10), [completedOn(3)], WEEKLY.frequency, WEEKLY.range)).toBe(
            false
        );
    });

    it('excludes the day being asked about from its own window', () => {
        // Otherwise completing a day would make that same day look auto-skipped.
        expect(isAutoSkipped(day(3), [completedOn(3)], WEEKLY.frequency, WEEKLY.range)).toBe(false);
    });

    it('never looks forward from the day being asked about', () => {
        expect(isAutoSkipped(day(2), [completedOn(3)], WEEKLY.frequency, WEEKLY.range)).toBe(false);
    });

    it('counts only completions, not skips or incomplete days', () => {
        const skipped = makeTrackerLite({ dated: '2025-12-03', status: TrackerStatus.SKIPPED });
        const notCompleted = makeTrackerLite({
            dated: '2025-12-03',
            status: TrackerStatus.NOT_COMPLETED
        });
        expect(isAutoSkipped(day(4), [skipped, notCompleted], 1, 7)).toBe(false);
    });

    it('requires as many completions in the window as the frequency asks for', () => {
        expect(isAutoSkipped(day(6), [completedOn(3)], 2, 7)).toBe(false);
        expect(isAutoSkipped(day(6), [completedOn(3), completedOn(5)], 2, 7)).toBe(true);
        expect(isAutoSkipped(day(6), [completedOn(3), completedOn(5)], 3, 7)).toBe(false);
    });

    it('ignores trackers with no date', () => {
        const undated = makeTrackerLite({ dated: '', status: TrackerStatus.COMPLETED });
        expect(isAutoSkipped(day(4), [undated], 1, 7)).toBe(false);
    });

    it('handles an empty tracker list', () => {
        expect(isAutoSkipped(day(4), [], 1, 7)).toBe(false);
    });

    it('spans a month boundary, since the window is walked as calendar days', () => {
        // Window for Dec 2 is Nov 26 - Dec 2, so a Nov 30 completion still counts.
        const novemberCompletion = makeTrackerLite({
            dated: '2025-11-30',
            status: TrackerStatus.COMPLETED
        });
        expect(isAutoSkipped(day(2), [novemberCompletion], 1, 7)).toBe(true);
        expect(isAutoSkipped(day(8), [novemberCompletion], 1, 7)).toBe(false);
    });

    it('ignores the time of day on the date it is handed', () => {
        const trackers = [completedOn(3)];
        expect(isAutoSkipped(new Date(2025, 11, 4, 23, 59), trackers, 1, 7)).toBe(true);
    });
});

describe('getTrackerDisplayStatus', () => {
    it('reports not-completed with no tracker and no auto-skip context', () => {
        expect(getTrackerDisplayStatus(undefined)).toBe(DisplayStatus.NOT_COMPLETED);
        expect(
            getTrackerDisplayStatus(makeTrackerLite({ status: TrackerStatus.NOT_COMPLETED }))
        ).toBe(DisplayStatus.NOT_COMPLETED);
    });

    it('maps an explicit tracker status straight across', () => {
        expect(getTrackerDisplayStatus(makeTrackerLite({ status: TrackerStatus.COMPLETED }))).toBe(
            DisplayStatus.COMPLETED
        );
        expect(getTrackerDisplayStatus(makeTrackerLite({ status: TrackerStatus.SKIPPED }))).toBe(
            DisplayStatus.SKIPPED
        );
    });

    it('lets an explicit status win over auto-skip eligibility', () => {
        const completed = completedOn(4);
        expect(
            getTrackerDisplayStatus(completed, {
                date: day(4),
                trackers: [completedOn(3), completed],
                ...WEEKLY,
                autoSkippedDates: new Set(['2025-12-04'])
            })
        ).toBe(DisplayStatus.COMPLETED);
    });

    it('reports auto-skipped from the server-supplied date set', () => {
        expect(
            getTrackerDisplayStatus(undefined, {
                date: day(4),
                trackers: [],
                ...WEEKLY,
                autoSkippedDates: new Set(['2025-12-04'])
            })
        ).toBe(DisplayStatus.AUTO_SKIPPED);
    });

    it('prefers the server date set over the local calculation, even when empty', () => {
        // The server computes against full history; a present-but-empty set means
        // "the server says no", so the local fallback must not override it.
        const trackers = [completedOn(3)];
        expect(isAutoSkipped(day(4), trackers, WEEKLY.frequency, WEEKLY.range)).toBe(true);
        expect(
            getTrackerDisplayStatus(undefined, {
                date: day(4),
                trackers,
                ...WEEKLY,
                autoSkippedDates: new Set()
            })
        ).toBe(DisplayStatus.NOT_COMPLETED);
    });

    it('falls back to the local calculation when no date set is supplied', () => {
        expect(
            getTrackerDisplayStatus(undefined, {
                date: day(4),
                trackers: [completedOn(3)],
                ...WEEKLY
            })
        ).toBe(DisplayStatus.AUTO_SKIPPED);
    });

    it('reports not-completed when neither source says auto-skipped', () => {
        expect(
            getTrackerDisplayStatus(undefined, {
                date: day(10),
                trackers: [completedOn(3)],
                ...WEEKLY
            })
        ).toBe(DisplayStatus.NOT_COMPLETED);
    });
});

describe('getDisplayStatusForDate', () => {
    const trackers = [completedOn(3), makeTrackerLite({ dated: '2025-12-05' })];

    it('uses the tracker that matches the date', () => {
        expect(getDisplayStatusForDate(trackers, day(3), WEEKLY)).toBe(DisplayStatus.COMPLETED);
    });

    it('folds in auto-skip for a date with no tracker of its own', () => {
        expect(getDisplayStatusForDate(trackers, day(4), WEEKLY)).toBe(DisplayStatus.AUTO_SKIPPED);
    });

    it('falls through to auto-skip for a row that is only marked not-completed', () => {
        // Dec 5 has its own not-completed row, but Dec 3's completion still puts
        // it inside the auto-skip window.
        expect(getDisplayStatusForDate(trackers, day(5), WEEKLY)).toBe(DisplayStatus.AUTO_SKIPPED);
    });

    it('reports not-completed for a date outside every window', () => {
        expect(getDisplayStatusForDate(trackers, day(20), WEEKLY)).toBe(
            DisplayStatus.NOT_COMPLETED
        );
    });

    it('honours the server-supplied auto-skipped dates when given', () => {
        expect(getDisplayStatusForDate(trackers, day(4), WEEKLY, new Set())).toBe(
            DisplayStatus.NOT_COMPLETED
        );
        expect(getDisplayStatusForDate(trackers, day(20), WEEKLY, new Set(['2025-12-20']))).toBe(
            DisplayStatus.AUTO_SKIPPED
        );
    });

    it('never auto-skips a daily habit', () => {
        expect(getDisplayStatusForDate(trackers, day(4), { frequency: 1, range: 1 })).toBe(
            DisplayStatus.NOT_COMPLETED
        );
    });
});

describe('getNextTrackerState', () => {
    it('starts the cycle at completed', () => {
        expect(getNextTrackerState(undefined)).toEqual({ status: TrackerStatus.COMPLETED });
        expect(
            getNextTrackerState(makeTrackerLite({ status: TrackerStatus.NOT_COMPLETED }))
        ).toEqual({ status: TrackerStatus.COMPLETED });
    });

    it('goes completed -> skipped -> not completed', () => {
        expect(getNextTrackerState(makeTrackerLite({ status: TrackerStatus.COMPLETED }))).toEqual({
            status: TrackerStatus.SKIPPED
        });
        expect(getNextTrackerState(makeTrackerLite({ status: TrackerStatus.SKIPPED }))).toEqual({
            status: TrackerStatus.NOT_COMPLETED
        });
    });

    it('closes the cycle in three steps', () => {
        const first = getNextTrackerState(undefined);
        const second = getNextTrackerState(makeTrackerLite({ status: first.status! }));
        const third = getNextTrackerState(makeTrackerLite({ status: second.status! }));
        expect([first.status, second.status, third.status]).toEqual([
            TrackerStatus.COMPLETED,
            TrackerStatus.SKIPPED,
            TrackerStatus.NOT_COMPLETED
        ]);
    });

    it('treats an unrecognised status as the end of the cycle (characterisation)', () => {
        // The final `else` catches anything that is not 0 or 2, so an unexpected
        // status value resets to not-completed rather than throwing.
        expect(getNextTrackerState(makeTrackerLite({ status: 99 }))).toEqual({
            status: TrackerStatus.NOT_COMPLETED
        });
    });
});

describe('createNewTracker', () => {
    it('defaults to a completed tracker with an empty note', () => {
        expect(createNewTracker(42, day(4))).toEqual({
            habit_id: 42,
            dated: '2025-12-04',
            status: TrackerStatus.COMPLETED,
            note: ''
        });
    });

    it('takes an explicit status', () => {
        expect(createNewTracker(42, day(4), TrackerStatus.SKIPPED).status).toBe(
            TrackerStatus.SKIPPED
        );
    });

    it('stores the local calendar day, not a UTC instant', () => {
        expect(createNewTracker(1, new Date(2025, 11, 4, 23, 30)).dated).toBe('2025-12-04');
    });
});

describe('findTrackerByDate', () => {
    const trackers = [completedOn(3), makeTrackerLite({ dated: '2025-12-05' })];

    it('finds the tracker whose dated matches the local day', () => {
        expect(findTrackerByDate(trackers, day(3))?.dated).toBe('2025-12-03');
        expect(findTrackerByDate(trackers, new Date(2025, 11, 5, 18, 0))?.dated).toBe('2025-12-05');
    });

    it('returns undefined when no tracker matches', () => {
        expect(findTrackerByDate(trackers, day(4))).toBeUndefined();
        expect(findTrackerByDate([], day(3))).toBeUndefined();
    });

    it('returns the first match when a day is duplicated', () => {
        const first = makeTrackerLite({ dated: '2025-12-07', status: TrackerStatus.COMPLETED });
        const second = makeTrackerLite({ dated: '2025-12-07', status: TrackerStatus.SKIPPED });
        expect(findTrackerByDate([first, second], day(7))).toBe(first);
    });
});
