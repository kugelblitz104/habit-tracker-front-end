import type { HabitRead, TrackerCreate, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState,
    getTrackerDisplayStatus
} from '@/features/trackers/utils/tracker-utils';
import type { DisplayStatus } from '@/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
 * Single-date tracker cycling with optimistic cache updates.
 *
 * This mirrors the optimistic create/update pattern in
 * `habit-list-element.tsx`, scoped to one date. `habit-list-element` keeps its
 * own copy because it additionally manages a multi-day grid, streak reporting,
 * note dialogs and long-press; unifying the two into this hook is a safe future
 * cleanup (TODO) but is out of scope for the Today habits panel.
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
    };

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onSuccess: async (data) => {
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: habit.id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    if (oldData.trackers.some((t) => t.id === data.id)) return oldData;
                    return { ...oldData, trackers: [...oldData.trackers, data] };
                }
            );
            invalidateTrackerCaches();
        },
        onError: (error) => {
            console.error('Error adding tracker:', error);
            toast.error('Failed to update habit. Please try again.');
        }
    });

    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onSuccess: async (data) => {
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: habit.id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    return {
                        ...oldData,
                        trackers: oldData.trackers.map((t) => (t.id === data.id ? data : t))
                    };
                }
            );
            invalidateTrackerCaches();
        },
        onError: (error) => {
            console.error('Error updating tracker:', error);
            toast.error('Failed to update habit. Please try again.');
        }
    });

    const toLite = (data: TrackerRead): TrackerLite => ({
        id: data.id,
        dated: data.dated ?? '',
        status: data.status ?? 2,
        has_note: !!data.note
    });

    const toggle = () => {
        // Ignore rapid re-clicks while a mutation is in flight so a double-click
        // before a create resolves can't fire two creates for the same date.
        if (trackerCreate.isPending || trackerUpdate.isPending) return;

        const tracker = findTrackerByDate(trackers, date);

        if (!tracker) {
            const newTracker = createNewTracker(habit.id, date);
            trackerCreate.mutate(newTracker, {
                onSuccess: (data) => setTrackers((prev) => [...prev, toLite(data)])
            });
            return;
        }

        const update = getNextTrackerState(tracker);
        trackerUpdate.mutate(
            { id: tracker.id, update },
            {
                onSuccess: (data) =>
                    setTrackers((prev) =>
                        prev.map((t) => (t.id === tracker.id ? toLite(data) : t))
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
