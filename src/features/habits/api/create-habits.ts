import { api } from "@/lib/api-client";
import type { Habit, HabitCreate } from "@/types/types";

export const createHabit = async (
    habit: HabitCreate
): Promise<Habit> => {
    return await api.post(`/habits/`, habit)
}