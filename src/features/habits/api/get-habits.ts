import { HabitsService, UsersService } from '@/api';
import type { HabitRead, HabitList } from '@/api';

export const getHabits = async (
    userId = 1,
    limit: number
): Promise<HabitList> => {
    return await UsersService.listUserHabitsUsersUserIdHabitsGet(userId, limit);
};

export const getHabit = async (habitId?: number): Promise<HabitRead> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.readHabitHabitsHabitIdGet(habitId);
};
