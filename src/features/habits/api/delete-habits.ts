import { HabitsService } from '@/api';

export const deleteHabit = async (habitId: number): Promise<void> => {
    await HabitsService.deleteHabitHabitsHabitIdDelete(habitId);
};
