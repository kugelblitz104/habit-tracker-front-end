import { TrackersService } from '@/api';
import type { TrackerRead, TrackerCreate } from '@/api';

export const createTracker = async (
    tracker: TrackerCreate
): Promise<TrackerRead> => {
    return await TrackersService.createTrackerTrackersPost(tracker);
};
