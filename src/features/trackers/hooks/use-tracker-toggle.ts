import type { HabitRead, TrackerLite } from '@/api';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import {
    toTrackerLite,
    useTrackerMutations
} from '@/features/trackers/hooks/use-tracker-mutations';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState,
    getTrackerDisplayStatus
} from '@/features/trackers/utils/tracker-utils';
import type { DisplayStatus } from '@/types/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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

    // Fetch a window wide enough to evaluate auto-skip against the habit's range.
    const days = Math.max(habit.range + 1, 2);

    const trackersQuery = useQuery({
        queryKey: ['trackers-lite', { habitId: habit.id }, days],
        queryFn: () => getTrackersLite(habit.id, undefined, days),
        staleTime: 1000 * 60
    });

    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    // Keep every consumer of this habit's trackers in sync. `habit-list-element`
    // /`habit-detail-page` read `['trackers', {habitId}]`, while the Today panel
    // and dashboard calendars read `['trackers-lite', {habitId}, days]`, so both
    // key families are invalidated (broad match on habitId).
    const invalidateTrackerCaches = () => {
        queryClient.invalidateQueries({ queryKey: ['trackers', { habitId: habit.id }] });
        queryClient.invalidateQueries({ queryKey: ['trackers-lite', { habitId: habit.id }] });
        // Server-computed KPIs/streaks depend on trackers; reconcile them too so any
        // tracker change (Today panel, dashboard, detail) never leaves them stale.
        queryClient.invalidateQueries({ queryKey: ['kpis', { habitId: habit.id }] });
        queryClient.invalidateQueries({ queryKey: ['streaks', { habitId: habit.id }] });
    };

    const { trackerCreate, trackerUpdate } = useTrackerMutations(habit.id, {
        onSuccess: invalidateTrackerCaches,
        onError: () => toast.error('Failed to update habit. Please try again.')
    });

    const toggle = () => {
        // Ignore rapid re-clicks while a mutation is in flight so a double-click
        // before a create resolves can't fire two creates for the same date.
        if (trackerCreate.isPending || trackerUpdate.isPending) return;

        const tracker = findTrackerByDate(trackers, date);

        if (!tracker) {
            const newTracker = createNewTracker(habit.id, date);
            trackerCreate.mutate(newTracker, {
                onSuccess: (data) => setTrackers((prev) => [...prev, toTrackerLite(data)])
            });
            return;
        }

        const update = getNextTrackerState(tracker);
        trackerUpdate.mutate(
            { id: tracker.id, update },
            {
                onSuccess: (data) =>
                    setTrackers((prev) =>
                        prev.map((t) => (t.id === tracker.id ? toTrackerLite(data) : t))
                    )
            }
        );
    };

    const status = getTrackerDisplayStatus(findTrackerByDate(trackers, date), {
        date,
        trackers,
        frequency: habit.frequency,
        range: habit.range
    });

    return {
        status,
        toggle,
        isPending: trackerCreate.isPending || trackerUpdate.isPending,
        isLoading: trackersQuery.isLoading
    };
};
