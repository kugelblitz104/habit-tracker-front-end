import type { HabitStreak } from '@/api';
import { HabitsService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getHabitStreaks = async (habitId: number): Promise<Array<HabitStreak>> => {
    if (!habitId) throw new Error('habitId is required');
    // tz makes the server compute "today" in the user's zone. NOT part of the
    // query key: the kpi-adapter optimistically patches ['streaks', { habitId }]
    // and the keys must stay identical for those patches to apply.
    return await HabitsService.readHabitStreaksHabitsHabitIdStreaksGet(
        habitId,
        getBrowserTimeZone()
    );
};

export const getHabitStreaksQueryOptions = (habitId: number | null | undefined) => {
    return queryOptions({
        queryKey: ['streaks', { habitId }],
        queryFn: () => getHabitStreaks(habitId!),
        enabled: !!habitId
    });
};

type UseHabitStreaksOptions = {
    habitId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getHabitStreaksQueryOptions>;
};

export const useHabitStreaks = ({ habitId, queryConfig }: UseHabitStreaksOptions) => {
    return useQuery({
        ...getHabitStreaksQueryOptions(habitId),
        ...queryConfig
    });
};
