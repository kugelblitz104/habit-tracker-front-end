import type { TrackerList } from '@/api';
import { HabitsService } from '@/api';

export const getTrackers = async (
    habitId: number,
    limit: number
): Promise<TrackerList> => {
    return await HabitsService.listHabitTrackersHabitsHabitIdTrackersGet(
        habitId,
        limit
    );
};
