import { TrackersService } from '@/api';
import type { TrackerRead, TrackerUpdate } from '@/api';

export const updateTracker = async (trackerId: number, tracker: TrackerUpdate): Promise<TrackerRead> => {
    console.log('Updating tracker:', tracker);
    return await TrackersService.patchTrackerTrackersTrackerIdPatch(trackerId, tracker);
};
