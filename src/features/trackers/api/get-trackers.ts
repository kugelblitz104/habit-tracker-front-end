import type { TrackerList, TrackerLiteList, TrackerRead } from '@/api';
import { HabitsService } from '@/api';

import { TrackersService } from '@/api';

export const getTracker = async (trackerId: number): Promise<TrackerRead> => {
    return await TrackersService.readTrackerTrackersTrackerIdGet(trackerId);
};

export const getTrackers = async (habitId: number, limit: number): Promise<TrackerList> => {
    return await HabitsService.listHabitTrackersHabitsHabitIdTrackersGet(habitId, limit);
};

/**
 * Fetch trackers in a lightweight format with date-based pagination.
 * @param habitId - The habit ID to fetch trackers for
 * @param endDate - End date for the range (defaults to today if undefined)
 * @param days - Number of days to fetch (default: 42 = 6 weeks)
 */
export const getTrackersLite = async (
    habitId: number,
    endDate?: string,
    days: number = 42
): Promise<TrackerLiteList> => {
    return await HabitsService.listHabitTrackersLiteHabitsHabitIdTrackersLiteGet(
        habitId,
        endDate,
        days
    );
};
