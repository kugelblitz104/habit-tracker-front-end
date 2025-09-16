import { api } from '@/lib/api-client';
import type { Tracker, TrackerCreate } from '@/types/types';

export const updateTracker = async (tracker: Tracker): Promise<Tracker> => {
    return await api.put(`/trackers/${tracker.id}`, tracker);
};
