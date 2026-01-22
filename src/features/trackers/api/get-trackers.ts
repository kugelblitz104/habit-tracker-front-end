import type { TrackerList, TrackerLiteList, TrackerRead } from '@/api';
import { HabitsService } from '@/api';

import { TrackersService } from '@/api';

export const getTracker = async (trackerId: number): Promise<TrackerRead> => {
    return await TrackersService.readTrackerTrackersTrackerIdGet(trackerId);
};

export const getTrackers = async (habitId: number, limit: number): Promise<TrackerList> => {
    return await HabitsService.listHabitTrackersHabitsHabitIdTrackersGet(habitId, limit);
};

export const getTrackersLite = async (
    habitId: number,
    limit: number = 70
): Promise<TrackerLiteList> => {
    return await HabitsService.listHabitTrackersLiteHabitsHabitIdTrackersLiteGet(habitId, limit);
};
