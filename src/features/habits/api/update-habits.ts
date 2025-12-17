import type { HabitRead, HabitUpdate } from '@/api';
import { HabitsService } from '@/api';

export const updateHabit = async (habitId: number, habit: HabitUpdate): Promise<HabitRead> => {
    return await HabitsService.patchHabitHabitsHabitIdPatch(habitId, habit);
};

export const sortHabits = async (habitIds: number[]): Promise<void> => {
    return await HabitsService.sortHabitsHabitsSortPut(habitIds);
};
