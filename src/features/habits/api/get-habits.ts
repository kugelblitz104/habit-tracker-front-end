import { api } from "@/lib/api-client";
import type { Habit } from "@/types/types";

export const getHabits = async (
    userId = 1,
    limit: number
): Promise<{
    habits: Habit[];
}> => {
    return await api.get(`/users/${userId}/habits?limit=${limit}`)
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