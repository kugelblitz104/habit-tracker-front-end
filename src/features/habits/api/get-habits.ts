import type { HabitKPIs, HabitList, HabitRead, Streak } from '@/api';
import { HabitsService, UsersService } from '@/api';

export const getHabits = async (userId = 1, limit = 100): Promise<HabitList> => {
    return await UsersService.listUserHabitsUsersUserIdHabitsGet(userId, limit);
};

export const getHabit = async (habitId?: number): Promise<HabitRead> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.readHabitHabitsHabitIdGet(habitId);
};

export const getHabitKPIs = async (habitId?: number): Promise<HabitKPIs> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.getHabitKpisHabitsHabitIdKpisGet(habitId);
};

export const getHabitStreaks = async (habitId?: number): Promise<Streak[]> => {
    if (!habitId) throw new Error('habitId is required');
    return await HabitsService.getHabitStreaksHabitsHabitIdStreaksGet(habitId);
};
