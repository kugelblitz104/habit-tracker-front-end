import { api } from '@/lib/api-client';
import type { Tracker, TrackerCreate } from '@/types/types';

export const createTracker = async (
    tracker: TrackerCreate
): Promise<Tracker> => {
    return await api.post(`/trackers/`, tracker);
};
