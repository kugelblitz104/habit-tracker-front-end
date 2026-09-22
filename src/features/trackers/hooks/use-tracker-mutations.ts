import type { TrackerCreate, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Project a full `TrackerRead` into the lite shape kept in component-local state. */
export const toTrackerLite = (data: TrackerRead): TrackerLite => ({
    id: data.id,
    dated: data.dated ?? '',
    status: data.status ?? 2,
    has_note: !!data.note
});

type UseTrackerMutationsOptions = {
    /** Runs after the optimistic `['trackers', {habitId}]` cache patch on every
     *  success, with the persisted row. */
    onSuccess?: (data: TrackerRead) => void;
    /** Runs after the error is logged to the console. */
    onError?: () => void;
};

/**
 * Shared optimistic tracker create/update mutations, used by the dashboard grid
 * (`habit-list`), the Today panel (`use-tracker-toggle`) and the detail view
 * (`use-habit-detail-data`). Each success patches EVERY
 * `['trackers', {habitId}]` cache entry (any days window) in place so all
 * consumers see the change immediately; per-surface follow-ups (invalidation,
 * toasts) plug in via `options`.
 *
 * The habit comes from the persisted row rather than from a hook argument: one
 * instance serves every row of the dashboard grid, so writes for different
 * habits can be in flight at once and an argument captured at render time
 * would name the wrong one.
 */
export const useTrackerMutations = (options: UseTrackerMutationsOptions = {}) => {
    const queryClient = useQueryClient();

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onSuccess: async (data) => {
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: data.habit_id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    // Only add if not already present
                    if (oldData.trackers.some((t) => t.id === data.id)) return oldData;
                    return { ...oldData, trackers: [...oldData.trackers, data] };
                }
            );
            options.onSuccess?.(data);
        },
        onError: (error) => {
            console.error('Error adding tracker:', error);
            options.onError?.();
        }
    });

    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onSuccess: async (data) => {
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: data.habit_id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    return {
                        ...oldData,
                        trackers: oldData.trackers.map((t) => (t.id === data.id ? data : t))
                    };
                }
            );
            options.onSuccess?.(data);
        },
        onError: (error) => {
            console.error('Error updating tracker:', error);
            options.onError?.();
        }
    });

    return { trackerCreate, trackerUpdate };
};
