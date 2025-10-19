import { HabitsService } from '@/api';
import type { HabitRead, HabitUpdate } from '@/api';

export const updateHabit = async (
    habitId: number,
    habit: HabitUpdate
): Promise<HabitRead> => {
    return await HabitsService.patchHabitHabitsHabitIdPatch(habitId, habit);
};
