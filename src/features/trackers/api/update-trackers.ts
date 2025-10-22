import type { TrackerRead, TrackerUpdate } from '@/api';
import { TrackersService } from '@/api';

export const updateTracker = async (
    trackerId: number,
    tracker: TrackerUpdate
): Promise<TrackerRead> => {
    return await TrackersService.patchTrackerTrackersTrackerIdPatch(
        trackerId,
        tracker
    );
};
