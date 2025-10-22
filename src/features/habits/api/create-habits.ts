import type { HabitCreate, HabitRead } from '@/api';
import { HabitsService } from '@/api';

export const createHabit = async (habit: HabitCreate): Promise<HabitRead> => {
    return await HabitsService.createHabitHabitsPost(habit);
};
