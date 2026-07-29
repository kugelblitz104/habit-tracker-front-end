import type { HabitRead, HabitUpdate } from '@/api';
import { HabitsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation } from '@tanstack/react-query';

export const updateHabit = async (habitId: number, habit: HabitUpdate): Promise<HabitRead> => {
    return await HabitsService.patchHabitHabitsHabitIdPatch(habitId, habit);
};

export const sortHabits = async (habitIds: number[]): Promise<void> => {
    return await HabitsService.sortHabitsHabitsSortPut(habitIds);
};

type UseSortHabitsOptions = {
    mutationConfig?: MutationConfig<typeof sortHabits>;
};

/**
 * No built-in cache invalidation — the dashboard page holds habits in local
 * state (for the drag-reorder modal) and reconciles by calling
 * `habitsQuery.refetch()` itself from `mutationConfig.onSuccess`.
 */
export const useSortHabits = ({ mutationConfig }: UseSortHabitsOptions = {}) => {
    return useMutation({
        mutationFn: sortHabits,
        ...mutationConfig
    });
};
