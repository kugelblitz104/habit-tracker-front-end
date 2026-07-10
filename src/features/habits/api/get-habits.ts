import type { HabitList, HabitRead } from '@/api';
import { HabitsService, UsersService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';

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
