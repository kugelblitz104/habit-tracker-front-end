import type { HabitCreate, HabitRead } from '@/api';
import { HabitsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation } from '@tanstack/react-query';

export const createHabit = async (habit: HabitCreate): Promise<HabitRead> => {
    return await HabitsService.createHabitHabitsPost(habit);
};

type UseCreateHabitOptions = {
    mutationConfig?: MutationConfig<typeof createHabit>;
};

/**
 * No built-in cache invalidation — the dashboard page holds habits in local
 * state (for the drag-reorder modal) and reconciles by calling
 * `habitsQuery.refetch()` itself from `mutationConfig.onSuccess`.
 */
export const useCreateHabit = ({ mutationConfig }: UseCreateHabitOptions = {}) => {
    return useMutation({
        mutationFn: createHabit,
        ...mutationConfig
    });
};
