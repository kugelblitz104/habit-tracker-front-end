import { queryOptions, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client";
import type { Habit, Meta } from "@/types/types";
import type { QueryConfig } from "@/lib/react-query";

export const getHabits = async (
    userId = 1,
): Promise<{
    habits: Habit[];
}> => {
    return await api.get(`/users/${userId}/habits`)
}

// export const getHabitQueryOptions = ({
//   userId,
// }: { userId?: number } = {}) => {
//   return queryOptions({
//     queryKey: userId ? ['habits', { userId }] : ['habits'],
//     queryFn: () => getHabits(userId),
//   });
// };

// type UseHabitOptions = {
//   userId?: number;
//   queryConfig?: QueryConfig<typeof getHabitQueryOptions>;
// };

// export const useHabits = ({
//   queryConfig,
//   userId = 1,
// }: UseHabitOptions) => {
//   return useQuery({
//     ...getHabitQueryOptions({ userId }),
//     ...queryConfig,
//   });
// };