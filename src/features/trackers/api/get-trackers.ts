import type { TrackerLiteList, TrackerRead } from '@/api';
import { HabitsService, TrackersService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';

export const getTracker = async (trackerId: number): Promise<TrackerRead> => {
    return await TrackersService.readTrackerTrackersTrackerIdGet(trackerId);
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
    // tz sets the DEFAULT end_date to today in the user's zone when endDate is
    // omitted (no-op when endDate is sent). Not part of any query key.
    return await HabitsService.listHabitTrackersLiteHabitsHabitIdTrackersLiteGet(
        habitId,
        endDate,
        days,
        getBrowserTimeZone()
    );
};
