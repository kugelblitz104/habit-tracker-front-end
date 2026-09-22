import type { TrackerCreate, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import { toTrackerLite } from '@/features/trackers/hooks/use-tracker-mutations';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState
} from '@/features/trackers/utils/tracker-utils';
import { toLocalDateString } from '@/lib/date-utils';
import { TrackerStatus } from '@/types/types';

/** The slice of a TanStack mutation this module uses.
 *
 *  `mutateAsync`, not `mutate`, and that is load-bearing. `MutationObserver.mutate`
 *  stores its per-call callbacks on the observer and re-points the observer at a
 *  fresh Mutation, so a second call while the first is still pending drops the
 *  first call's `onSuccess`/`onError` and they never fire. One
 *  `useTrackerMutations()` instance serves the whole dashboard grid, so that
 *  happens on any two quick clicks. The promise `mutateAsync` returns comes from
 *  `Mutation.execute` and settles regardless of which observer holds the mutation. */
type MutationLike<TVars> = {
    mutateAsync: (vars: TVars) => Promise<TrackerRead>;
};

/** Identity of one toggleable cell: a habit's row for a single date. */
export const trackerCellKey = (habitId: number, date: Date): string =>
    `${habitId}:${toLocalDateString(date)}`;

export type CycleTrackerArgs = {
    habitId: number;
    date: Date;
    trackers: TrackerLite[];
    /** Apply an optimistic change to whatever store the caller owns: local
     *  state on the Today panel, a query cache entry on the dashboard grid. */
    patch: (update: (trackers: TrackerLite[]) => TrackerLite[]) => void;
    /** Cells whose write is in flight, owned by the caller's surface. Keyed by
     *  `trackerCellKey`, not by a single boolean: one mutation pair serves the
     *  whole dashboard grid, so a global lock would drop a click on a
     *  different habit. Every exit path deletes the key it added. */
    inFlight: Set<string>;
    trackerCreate: MutationLike<TrackerCreate>;
    trackerUpdate: MutationLike<{ id: number; update: TrackerUpdate }>;
};

/**
 * Cycle the tracker for one date: not completed -> completed -> skipped -> ...
 *
 * The change is applied to the caller's store up front so the cell reacts
 * instantly, the request fires in the background, and the row is reconciled
 * with the server on success or rolled back on failure.
 */
export const cycleTrackerOptimistically = ({
    habitId,
    date,
    trackers,
    patch,
    inFlight,
    trackerCreate,
    trackerUpdate
}: CycleTrackerArgs): void => {
    // Ignore rapid re-clicks on THIS cell while its write is in flight, so a
    // double-click before a create resolves can't fire two creates (or update
    // an as-yet unpersisted optimistic row) for the same date. Another cell's
    // click is unaffected.
    const cellKey = trackerCellKey(habitId, date);
    if (inFlight.has(cellKey)) return;
    inFlight.add(cellKey);
    const release = () => inFlight.delete(cellKey);

    const tracker = findTrackerByDate(trackers, date);

    if (!tracker) {
        const newTracker = createNewTracker(habitId, date);
        const tempId = -Date.now();
        const optimistic: TrackerLite = {
            id: tempId,
            dated: newTracker.dated ?? '',
            status: newTracker.status ?? TrackerStatus.COMPLETED,
            has_note: !!newTracker.note
        };
        patch((prev) => [...prev, optimistic]);
        // `release` is the first link in the chain so nothing downstream can
        // keep the cell locked, and it runs on both settle paths. The rejection
        // handler is required: mutateAsync rejects, unlike mutate.
        void trackerCreate
            .mutateAsync(newTracker)
            .finally(release)
            .then(
                (data) =>
                    patch((prev) => prev.map((t) => (t.id === tempId ? toTrackerLite(data) : t))),
                () => patch((prev) => prev.filter((t) => t.id !== tempId))
            );
        return;
    }

    const update = getNextTrackerState(tracker);
    const previous = trackers;
    patch((prev) =>
        prev.map((t) => (t.id === tracker.id ? { ...t, status: update.status ?? t.status } : t))
    );
    void trackerUpdate
        .mutateAsync({ id: tracker.id, update })
        .finally(release)
        .then(
            (data) =>
                patch((prev) => prev.map((t) => (t.id === tracker.id ? toTrackerLite(data) : t))),
            () => patch(() => previous)
        );
};
