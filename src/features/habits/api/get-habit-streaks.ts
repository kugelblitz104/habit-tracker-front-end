import type { HabitStreak } from '@/api';
import { HabitsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getHabitStreaks = async (habitId: number): Promise<Array<HabitStreak>> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.readHabitStreaksHabitsHabitIdStreaksGet(habitId);
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
