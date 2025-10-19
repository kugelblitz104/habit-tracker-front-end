import { HabitsService } from '@/api';
import type { TrackerList, TrackerRead } from '@/api';

export const getTrackers = async (
    habitId: number,
    limit: number
): Promise<TrackerList> => {
    return await HabitsService.listHabitTrackersHabitsHabitIdTrackersGet(
        habitId,
        limit
    );
};
