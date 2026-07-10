import type { HabitKPIs } from '@/api';
import { HabitsService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getHabitKpis = async (habitId: number): Promise<HabitKPIs> => {
    if (!habitId) throw new Error('habitId is required');
    // tz makes the server compute "today" in the user's zone. NOT part of the
    // query key: the kpi-adapter optimistically patches ['kpis', { habitId }]
    // and the keys must stay identical for those patches to apply.
    return await HabitsService.readHabitKpisHabitsHabitIdKpisGet(habitId, getBrowserTimeZone());
};

export const getHabitKpisQueryOptions = (habitId: number | null | undefined) => {
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
