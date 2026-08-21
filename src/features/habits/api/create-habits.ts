import type { HabitCreate, HabitRead } from '@/api';
import { HabitsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';
import { invalidateHabits } from './query-keys';

export const createHabit = async (habit: HabitCreate): Promise<HabitRead> => {
    return await HabitsService.createHabitHabitsPost(habit);
};

/**
 * Invalidates the habits list on success, same as `useCreateProject` /
 * `useCreateCountdown`. `HabitsDashboard`'s own capture bar additionally
 * patches its local `habits` state (for the drag-reorder modal) via its own
 * `mutationConfig.onSuccess`, which this still forwards untouched.
 */
export const useCreateHabit = defineMutationHook(createHabit, (queryClient) => {
    invalidateHabits(queryClient);
});
