import { api } from '@/lib/api-client';
import type { Habit } from '@/types/types';

export const deleteHabit = async (habit: Habit): Promise<void> => {
    return await api.delete(`/habits/${habit.id}`);
};
