import type { HabitRead, TrackerCreate, TrackerLite, TrackerUpdate } from '@/api';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { calculateStreaks, getCurrentStreakLength } from '@/features/trackers/utils/kpi-utils';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState
} from '@/features/trackers/utils/tracker-utils';
import { TrackerStatus } from '@/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

export const useHabitListItem = (habit: HabitRead, days: number) => {
    const queryClient = useQueryClient();
    const habitId = habit.id;

    const trackersQuery = useQuery({
        queryKey: ['trackers-lite', { habitId }, days],
        queryFn: () => getTrackersLite(habitId, undefined, days),
        staleTime: 1000 * 60
    });

    const trackers: TrackerLite[] = trackersQuery.data?.trackers ?? [];

    const currentStreak = useMemo(() => {
        if (trackers.length === 0) return 0;
        const streaks = calculateStreaks(
            trackers,
            habit.frequency,
            habit.range,
            habit.created_date
        );
        return getCurrentStreakLength(streaks);
    }, [trackers, habit.frequency, habit.range, habit.created_date]);

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onMutate: async (tracker) => {
            await queryClient.cancelQueries({ queryKey: ['trackers-lite', { habitId }] });
            const previousData = queryClient.getQueriesData<{ trackers: TrackerLite[] }>({
                queryKey: ['trackers-lite', { habitId }]
            });
            const optimisticTracker: TrackerLite = {
                id: -Date.now(),
                dated: tracker.dated ?? '',
                status: tracker.status ?? TrackerStatus.COMPLETED,
                has_note: !!tracker.note
            };
            queryClient.setQueriesData<{ trackers: TrackerLite[] }>(
                { queryKey: ['trackers-lite', { habitId }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    if (oldData.trackers.some((t) => t.dated === optimisticTracker.dated))
                        return oldData;
                    return { ...oldData, trackers: [...oldData.trackers, optimisticTracker] };
                }
            );
            return { previousData };
        },
        onError: (_, __, context) => {
            context?.previousData.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['trackers-lite', { habitId }] });
        }
    });

    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onMutate: async ({ id, update }) => {
            await queryClient.cancelQueries({ queryKey: ['trackers-lite', { habitId }] });
            const previousData = queryClient.getQueriesData<{ trackers: TrackerLite[] }>({
                queryKey: ['trackers-lite', { habitId }]
            });
            queryClient.setQueriesData<{ trackers: TrackerLite[] }>(
                { queryKey: ['trackers-lite', { habitId }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    return {
                        ...oldData,
                        trackers: oldData.trackers.map((t) => {
                            if (t.id !== id) return t;
                            return {
                                ...t,
                                status: update.status ?? t.status,
                                has_note: update.note !== undefined ? !!update.note : t.has_note
                            };
                        })
                    };
                }
            );
            return { previousData };
        },
        onError: (_, __, context) => {
            context?.previousData.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['trackers-lite', { habitId }] });
        }
    });

    const handleCheckboxClick = (date: Date) => {
        const tracker = findTrackerByDate(trackers, date);
        if (!tracker) {
            trackerCreate.mutate(createNewTracker(habitId, date));
            return;
        }
        trackerUpdate.mutate({ id: tracker.id, update: getNextTrackerState(tracker) });
    };

    return {
        trackers,
        currentStreak,
        handleCheckboxClick,
        isLoading: trackersQuery.isLoading
    };
};
