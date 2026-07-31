import type { HabitList, HabitRead } from '@/api';
import { HabitsService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { habitKeys } from './query-keys';

export const getHabits = async (profileId: number, limit = 100): Promise<HabitList> => {
    // tz keeps completed_today/skipped_today aligned with the USER's day, not
    // the server's (UTC) clock. Intentionally not part of any query key: the
    // browser zone is stable for a session, so keys stay unchanged.
    return await HabitsService.listHabitsHabitsGet(profileId, limit, getBrowserTimeZone());
};

export const getHabit = async (habitId: number): Promise<HabitRead> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.readHabitHabitsHabitIdGet(habitId, getBrowserTimeZone());
};

const getHabitsQueryOptions = (profileId: number | null | undefined, limit = 100) => {
    return queryOptions({
        queryKey: habitKeys.list(profileId),
        queryFn: () => {
            // `enabled` below keeps this from firing without a profile, but the
            // guard also narrows profileId to `number` for getHabits without a cast.
            if (!profileId) throw new Error('profileId is required');
            return getHabits(profileId, limit);
        },
        enabled: !!profileId,
        staleTime: 1000 * 60 // 1 minute
    });
};

type UseHabitsOptions = {
    profileId: number | null | undefined;
    limit?: number;
    queryConfig?: QueryConfig<typeof getHabitsQueryOptions>;
};

export const useHabits = ({ profileId, limit = 100, queryConfig }: UseHabitsOptions) => {
    return useQuery({
        ...getHabitsQueryOptions(profileId, limit),
        ...queryConfig
    });
};
