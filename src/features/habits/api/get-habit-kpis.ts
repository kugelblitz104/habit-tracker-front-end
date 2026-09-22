import type { HabitKPIs, HabitKPIsEntry } from '@/api';
import { HabitsService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';
import type { QueryConfig } from '@/lib/react-query';
import { pagedList } from '@/lib/paginate';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getHabitKpis = async (habitId: number): Promise<HabitKPIs> => {
    if (!habitId) throw new Error('habitId is required');
    // tz makes the server compute "today" in the user's zone. NOT part of the
    // query key: the kpi-adapter optimistically patches ['kpis', { habitId }]
    // and the keys must stay identical for those patches to apply.
    return await HabitsService.readHabitKpisHabitsHabitIdKpisGet(habitId, getBrowserTimeZone());
};

const getHabitKpisQueryOptions = (habitId: number | null | undefined) => {
    return queryOptions({
        queryKey: ['kpis', { habitId }],
        queryFn: () => getHabitKpis(habitId!),
        enabled: !!habitId
    });
};

type UseHabitKpisOptions = {
    habitId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getHabitKpisQueryOptions>;
};

export const useHabitKpis = ({ habitId, queryConfig }: UseHabitKpisOptions) => {
    return useQuery({
        ...getHabitKpisQueryOptions(habitId),
        ...queryConfig
    });
};

export type HabitsKpisOptions = {
    profileId: number;
    archived?: boolean;
};

/**
 * Fetch computed KPIs for every habit in a profile, all pages.
 *
 * Replaces one getHabitKpis call (and one full-history scan) per habit. tz
 * is resolved exactly as the singular resolves it, because callers seed the
 * per-habit ['kpis', {habitId}] cache from these entries and that key
 * carries no tz.
 */
export const getHabitsKpis = async ({
    profileId,
    archived
}: HabitsKpisOptions): Promise<HabitKPIsEntry[]> => {
    const tz = getBrowserTimeZone();

    const { items } = await pagedList<HabitKPIsEntry>(
        ({ offset, limit }) =>
            HabitsService.listHabitsKpisHabitsKpisGet(profileId, tz, archived, limit, offset).then(
                (page) => ({ items: page.items ?? [], total: page.total })
            ),
        { identify: (item) => item.habit_id }
    );

    return items;
};
