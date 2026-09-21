import type { HabitRead, HabitUpdate } from '@/api';
import { HabitsService } from '@/api';
import { habitKeys, invalidateHabits } from '@/features/habits/api/query-keys';
import type { MutationConfig } from '@/lib/react-query';
import { defineMutationHook } from '@/lib/react-query';
import { useMutation } from '@tanstack/react-query';

export const updateHabit = async (habitId: number, habit: HabitUpdate): Promise<HabitRead> => {
    return await HabitsService.patchHabitHabitsHabitIdPatch(habitId, habit);
};

export type UpdateHabitInput = {
    habitId: number;
    data: HabitUpdate;
};

/**
 * Object-shaped wrapper over `updateHabit`, matching every other entity's
 * `{ id, data }` mutation input rather than that function's positional
 * signature.
 */
const updateHabitInput = async ({ habitId, data }: UpdateHabitInput): Promise<HabitRead> =>
    await updateHabit(habitId, data);

/**
 * The plain habit-update hook. The habit detail page deliberately does NOT use
 * this - it builds its own mutation so it can patch the KPI caches optimistically
 * (see `use-habit-detail-data.ts`). Use this one where an invalidation is enough.
 */
export const useUpdateHabit = defineMutationHook(updateHabitInput, (queryClient, data) => {
    invalidateHabits(queryClient);
    queryClient.invalidateQueries({ queryKey: habitKeys.detail(data.id) });
});

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
