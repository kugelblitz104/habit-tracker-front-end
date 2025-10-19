import { HabitsService } from '@/api';
import type { HabitRead, HabitCreate } from '@/api';

export const createHabit = async (habit: HabitCreate): Promise<HabitRead> => {
    return await HabitsService.createHabitHabitsPost(habit);
};
