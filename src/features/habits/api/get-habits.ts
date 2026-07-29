import type { HabitList, HabitRead } from '@/api';
import { HabitsService, UsersService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { habitKeys } from './query-keys';

export const getHabits = async (
    userId: number,
    limit = 100,
    profileId?: number | null
): Promise<HabitList> => {
    // tz keeps completed_today/skipped_today aligned with the USER's day, not
    // the server's (UTC) clock. Intentionally not part of any query key: the
    // browser zone is stable for a session, so keys stay unchanged.
    return await UsersService.listUserHabitsUsersUserIdHabitsGet(
        userId,
        limit,
        profileId,
        getBrowserTimeZone()
    );
};

export const getHabit = async (habitId: number): Promise<HabitRead> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.readHabitHabitsHabitIdGet(habitId, getBrowserTimeZone());
};

const getHabitsQueryOptions = (
    userId: number,
    profileId: number | null | undefined,
    limit = 100
) => {
    return queryOptions({
        queryKey: habitKeys.list(userId, profileId),
        queryFn: () => getHabits(userId, limit, profileId),
        enabled: !!profileId,
        staleTime: 1000 * 60 // 1 minute
    });
};

type UseHabitsOptions = {
    userId: number;
    profileId: number | null | undefined;
    limit?: number;
    queryConfig?: QueryConfig<typeof getHabitsQueryOptions>;
};

export const useHabits = ({ userId, profileId, limit = 100, queryConfig }: UseHabitsOptions) => {
    return useQuery({
        ...getHabitsQueryOptions(userId, profileId, limit),
        ...queryConfig
    });
};
