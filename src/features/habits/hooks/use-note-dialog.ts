import type { TrackerCreate, TrackerLite, TrackerUpdate } from '@/api';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTracker } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { createNewTracker } from '@/features/trackers/utils/tracker-utils';
import { TrackerStatus } from '@/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export const useNoteDialog = () => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedHabitID, setSelectedHabitID] = useState<number | null>(null);
    const [selectedTrackerID, setSelectedTrackerID] = useState<number | null>(null);

    const selectedTrackerFullQuery = useQuery({
        queryKey: ['tracker', selectedTrackerID],
        queryFn: () => getTracker(selectedTrackerID!),
        enabled: !!selectedTrackerID && isOpen,
        staleTime: 0
    });

    const selectedTrackerFull = selectedTrackerFullQuery.data;

    const handleNoteClose = () => setIsOpen(false);

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onSuccess: handleNoteClose,
        onSettled: () =>
            queryClient.invalidateQueries({
                queryKey: ['trackers-lite', { habitId: selectedHabitID }]
            })
    });

    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onSuccess: handleNoteClose,
        onSettled: () =>
            queryClient.invalidateQueries({
                queryKey: ['trackers-lite', { habitId: selectedHabitID }]
            })
    });

    const handleNoteOpen = (habitID: number, date: Date, tracker: TrackerLite | undefined) => {
        setSelectedHabitID(habitID);
        setSelectedDate(date);
        setSelectedTrackerID(tracker?.id ?? null);
        setIsOpen(true);
    };

    const handleNoteSave = (note: string) => {
        if (!selectedHabitID || !selectedDate) return;
        if (!selectedTrackerID) {
            const newTracker = createNewTracker(
                selectedHabitID,
                selectedDate,
                TrackerStatus.NOT_COMPLETED,
                note
            );
            trackerCreate.mutate(newTracker);
        } else if (selectedTrackerFull) {
            trackerUpdate.mutate({ id: selectedTrackerFull.id, update: { note } });
        }
    };

    return {
        noteDialogProps: {
            isOpen,
            date: selectedDate ?? new Date(),
            note: selectedTrackerFull?.note ?? '',
            onClose: handleNoteClose,
            onSave: handleNoteSave
        },
        handleNoteOpen
    };
};
