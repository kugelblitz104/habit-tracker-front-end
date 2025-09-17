import { api } from '@/lib/api-client';
import type { Habit } from '@/types/types';

export const getHabits = async (
    userId = 1,
    limit: number
): Promise<{
    habits: Habit[];
}> => {
    return await api.get(`/users/${userId}/habits?limit=${limit}`);
};

export const getHabit = async (habitId?: number): Promise<Habit> => {
    return await api.get(`/habits/${habitId}`);
};
