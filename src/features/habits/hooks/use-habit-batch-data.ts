import type { HabitKPIs, HabitTrackersLite } from '@/api';
import { getHabitsKpis } from '@/features/habits/api/get-habit-kpis';
import { getHabitsTrackersLite } from '@/features/trackers/api/get-trackers';
import {
    habitsKpisBatchKey,
    habitsTrackersBatchKey,
    trackerKeys
} from '@/features/trackers/api/query-keys';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Query keys for the profile-wide habit batch reads.
 *
 * Distinct prefixes from the per-habit families (`trackers-lite`, `kpis`) on
 * purpose: `invalidateHabitTrackers` invalidates the per-habit families by
 * habit, and reaches the trackers batch (but never the KPI batch, which is
 * patched then reconciled one habit at a time). The prefixes themselves live
 * in `query-keys.ts` so that function can reference them without a cycle.
 */
export const habitBatchKeys = {
    trackers: (
        profileId: number | null | undefined,
        days: number,
        endDate: string | undefined,
        archived: boolean | undefined
    ) => [...habitsTrackersBatchKey, { profileId, days, endDate, archived }] as const,
    kpis: (profileId: number | null | undefined, archived: boolean | undefined) =>
        [...habitsKpisBatchKey, { profileId, archived }] as const
};

type TrackersBatchOptions = {
    profileId: number | null | undefined;
    days: number;
    /** Send it explicitly. Omitting it lets a session open across midnight
     *  serve the previous day, and keeps the resolved day out of the key. */
    endDate?: string;
    archived?: boolean;
};

export const useHabitTrackersBatch = ({
    profileId,
    days,
    endDate,
    archived
}: TrackersBatchOptions) => {
    const query = useQuery({
        queryKey: habitBatchKeys.trackers(profileId, days, endDate, archived),
        queryFn: () => getHabitsTrackersLite({ profileId: profileId!, endDate, days, archived }),
        enabled: !!profileId,
        staleTime: 1000 * 60,
        placeholderData: keepPreviousData
    });

    const byHabit = useMemo(
        () => new Map<number, HabitTrackersLite>((query.data ?? []).map((e) => [e.habit_id, e])),
        [query.data]
    );

    return { ...query, byHabit };
};

type KpisBatchOptions = {
    profileId: number | null | undefined;
    archived?: boolean;
};

export const useHabitKpisBatch = ({ profileId, archived }: KpisBatchOptions) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: habitBatchKeys.kpis(profileId, archived),
        queryFn: async () => {
            const entries = await getHabitsKpis({ profileId: profileId!, archived });
            // Seed the per-habit cache the detail pane's KPI board and
            // kpi-adapter's optimistic patches share, so opening a habit is
            // instant. Safe only because getHabitsKpis resolves tz exactly as
            // getHabitKpis does - that key carries no tz.
            for (const entry of entries) {
                queryClient.setQueryData(trackerKeys.kpis(entry.habit_id), entry.kpis);
            }
            return entries;
        },
        enabled: !!profileId,
        staleTime: 1000 * 60,
        placeholderData: keepPreviousData
    });

    const byHabit = useMemo(
        () => new Map<number, HabitKPIs>((query.data ?? []).map((e) => [e.habit_id, e.kpis])),
        [query.data]
    );

    return { ...query, byHabit };
};
