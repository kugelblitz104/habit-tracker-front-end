import { api } from "@/lib/api-client";
import type { Tracker } from "@/types/types"

export const getTrackers = async (
    habitId: number,
): Promise<{
    trackers: Tracker[];
}> => {
    return await api.get(`/habits/${habitId}/trackers`)
}