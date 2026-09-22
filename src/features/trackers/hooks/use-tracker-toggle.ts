import type { HabitRead, TrackerLite } from '@/api';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { invalidateHabitTrackers } from '@/features/trackers/api/query-keys';
import { useTrackerMutations } from '@/features/trackers/hooks/use-tracker-mutations';
import { cycleTrackerOptimistically } from '@/features/trackers/utils/cycle-tracker';
import { getDisplayStatusForDate } from '@/features/trackers/utils/tracker-utils';
import type { DisplayStatus } from '@/types/types';
import { getHabitKpis } from '@/features/habits/api/get-habit-kpis';
import { reconcileHabitKpis } from '@/features/trackers/utils/habit-kpi-cache';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    // server-computed KPI/streak caches and the dashboard's profile-wide
    // trackers batch, which all depend on trackers. The KPI batch is not
    // invalidated (a whole-profile scan); this habit's entry is refetched on
    // its own, and only when a batch is actually cached.
    const { trackerCreate, trackerUpdate } = useTrackerMutations({
        onSuccess: (data) => {
            invalidateHabitTrackers(queryClient, data.habit_id);
            void reconcileHabitKpis(queryClient, data.habit_id, getHabitKpis);
        },
        onError: () => toast.error('Failed to update habit. Please try again.')
    });

    // One cell (this habit, this date), so this set never holds more than one
    // key; cycleTrackerOptimistically owns adding and clearing it.
    const inFlightRef = useRef(new Set<string>());

    const toggle = () =>
        cycleTrackerOptimistically({
            habitId: habit.id,
            date,
            trackers,
            patch: setTrackers,
            inFlight: inFlightRef.current,
            trackerCreate,
            trackerUpdate
        });

    const status = getDisplayStatusForDate(trackers, date, habit, autoSkippedDates);

    return {
        status,
        toggle,
        isPending: trackerCreate.isPending || trackerUpdate.isPending,
        isLoading: trackersQuery.isLoading
    };
};
