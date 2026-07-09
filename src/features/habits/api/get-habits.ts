import type { HabitList, HabitRead } from '@/api';
import { HabitsService, UsersService } from '@/api';

export const getHabits = async (
    userId: number,
    limit = 100,
    profileId?: number | null
): Promise<HabitList> => {
    return await UsersService.listUserHabitsUsersUserIdHabitsGet(userId, limit, profileId);
};

export const getHabit = async (habitId: number): Promise<HabitRead> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.readHabitHabitsHabitIdGet(habitId);
};
