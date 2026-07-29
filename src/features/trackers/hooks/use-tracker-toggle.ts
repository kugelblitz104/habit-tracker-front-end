import type { HabitRead, TrackerLite } from '@/api';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { invalidateHabitTrackers } from '@/features/trackers/api/query-keys';
import {
    toTrackerLite,
    useTrackerMutations
} from '@/features/trackers/hooks/use-tracker-mutations';
import {
    createNewTracker,
    findTrackerByDate,
    getDisplayStatusForDate,
    getNextTrackerState
} from '@/features/trackers/utils/tracker-utils';
import { TrackerStatus, type DisplayStatus } from '@/types/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export type UseTrackerToggleResult = {
    /** Display status for `date` (complete / incomplete / skipped / auto-skipped). */
    status: DisplayStatus;
    /** Cycle the tracker for `date`: not completed → completed → skipped → …. */
    toggle: () => void;
    isPending: boolean;
    isLoading: boolean;
};

/**
 * Single-date tracker cycling with optimistic cache updates, built on the
 * shared `useTrackerMutations`. On top of the shared cache patching this hook
 * also invalidates the lite/KPI/streak caches and toasts on error — the Today
 * panel is a summary surface, so every other consumer of this habit's data
 * must reconcile.
 */
export const useTrackerToggle = (habit: HabitRead, date: Date): UseTrackerToggleResult => {
    const queryClient = useQueryClient();
    const [trackers, setTrackers] = useState<TrackerLite[]>([]);

    // Only `date` is rendered, so only `date` needs a row. Auto-skip used to
    // force a `range + 1` window here; the server now evaluates it against full
    // history and returns `auto_skipped_dates`. Two days, not one, so a session
    // sitting across midnight still has yesterday's row on hand.
    const days = 2;

    const trackersQuery = useQuery({
        queryKey: ['trackers-lite', { habitId: habit.id }, days],
        queryFn: () => getTrackersLite(habit.id, undefined, days),
        staleTime: 1000 * 60
    });

    // undefined (not an empty Set) when the server didn't send the field, so
    // getDisplayStatusForDate falls back to computing locally. An empty Set is
    // truthy and would silently suppress auto-skip against an older backend.
    const autoSkippedDates = useMemo(() => {
        const dates = trackersQuery.data?.auto_skipped_dates;
        return dates ? new Set(dates) : undefined;
    }, [trackersQuery.data]);

    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    // Keep every consumer of this habit's trackers in sync. `habit-list-element`
    // /`habit-detail-page` read `['trackers', {habitId}]`, while the Today panel
    // and dashboard calendars read `['trackers-lite', {habitId}, days]`, so both
    // key families are invalidated (broad match on habitId) — along with the
    // server-computed KPI/streak caches, which depend on trackers.
    const { trackerCreate, trackerUpdate } = useTrackerMutations(habit.id, {
        onSuccess: () => invalidateHabitTrackers(queryClient, habit.id),
        onError: () => toast.error('Failed to update habit. Please try again.')
    });

    const toggle = () => {
        // Ignore rapid re-clicks while a mutation is in flight so a double-click
        // before a create resolves can't fire two creates (or update an as-yet
        // unpersisted optimistic row) for the same date.
        if (trackerCreate.isPending || trackerUpdate.isPending) return;

        const tracker = findTrackerByDate(trackers, date);

        // Optimistic path: apply the change to local state up front so the
        // checkbox reacts instantly, fire the request in the background, then
        // reconcile with the server row on success or roll back on failure.
        // (The hook-level onError toast still surfaces the failure.)
        if (!tracker) {
            const newTracker = createNewTracker(habit.id, date);
            const tempId = -Date.now();
            const optimistic: TrackerLite = {
                id: tempId,
                dated: newTracker.dated ?? '',
                status: newTracker.status ?? TrackerStatus.COMPLETED,
                has_note: !!newTracker.note
            };
            setTrackers((prev) => [...prev, optimistic]);
            trackerCreate.mutate(newTracker, {
                onSuccess: (data) =>
                    setTrackers((prev) =>
                        prev.map((t) => (t.id === tempId ? toTrackerLite(data) : t))
                    ),
                onError: () => setTrackers((prev) => prev.filter((t) => t.id !== tempId))
            });
            return;
        }

        const update = getNextTrackerState(tracker);
        const previousTrackers = trackers;
        setTrackers((prev) =>
            prev.map((t) =>
                t.id === tracker.id ? { ...t, status: update.status ?? t.status } : t
            )
        );
        trackerUpdate.mutate(
            { id: tracker.id, update },
            {
                onSuccess: (data) =>
                    setTrackers((prev) =>
                        prev.map((t) => (t.id === tracker.id ? toTrackerLite(data) : t))
                    ),
                onError: () => setTrackers(previousTrackers)
            }
        );
    };

    const status = getDisplayStatusForDate(trackers, date, habit, autoSkippedDates);

    return {
        status,
        toggle,
        isPending: trackerCreate.isPending || trackerUpdate.isPending,
        isLoading: trackersQuery.isLoading
    };
};
