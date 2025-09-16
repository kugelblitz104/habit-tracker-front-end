import { api } from '@/lib/api-client';
import type { Habit } from '@/types/types';

export const updateHabit = async (
    habit: Habit
): Promise<{
    habit: Habit;
}> => {
    return await api.put(`/habits/${habit.id}`, habit);
};
