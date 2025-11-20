import type {
    HabitRead,
    TrackerCreate,
    TrackerRead,
    TrackerUpdate
} from '@/api';
import { Label } from '@/components/ui/label';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackers } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState,
    getTrackerIcon,
    getTrackerStatus
} from '@/features/trackers/utils/tracker-utils';
import { getFrequencyString } from '@/lib/date-utils';
import { Status } from '@/types/types';
import { Button } from '@headlessui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

export type TrackerCheckboxProps = {
    status: Status;
    onClick?: () => void;
};

const TrackerCheckbox = ({
    status = Status.NOT_COMPLETED,
    onClick
}: TrackerCheckboxProps) => {
    return (
        <Button type='button' className='align-middle' onClick={onClick}>
            {getTrackerIcon(status)}
        </Button>
    );
};

export type HabitListElementProps = {
    habit: HabitRead;
    days: number;
    // onHabitUpdate: (habit: HabitRead) => void;
};

export const HabitListElement = ({ habit, days }: HabitListElementProps) => {
    // Use useMemo to prevent hydration mismatch - date created once and stable
    const today = useMemo(() => new Date(), []);
    const dates = useMemo(
        () =>
            [...Array(days).keys()].map((day) => {
                return new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate() - day,
                    today.getHours(),
                    today.getMinutes(),
                    today.getSeconds(),
                    today.getMilliseconds()
                );
            }),
        [days, today]
    );
    const [rowIsActive, setRowIsActive] = useState<boolean>(false);
    const [trackers, setTrackers] = useState<TrackerRead[]>([]);
    const trackersQuery = useQuery({
        queryKey: ['trackers', { habitId: habit.id }],
        queryFn: () => getTrackers(habit.id, days),
        staleTime: 1000 * 60 // 1 minute
    });

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onError: (error) => {
            console.error('Error adding tracker:', error);
        }
    });
    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onError: (error) => {
            console.error('Error updating tracker:', error);
        }
    });

    // functions
    const getStatus = (date: Date): Status => {
        const tracker = findTrackerByDate(trackers, date);
        return getTrackerStatus(tracker);
    };

    const handleCheckboxClick = (date: Date) => {
        const tracker = findTrackerByDate(trackers, date);

        if (!tracker) {
            // create tracker if it doesn't exist
            const newTracker = createNewTracker(habit.id, date);
            trackerCreate.mutate(newTracker, {
                onSuccess: (data) => {
                    setTrackers([...trackers, data]);
                }
            });
            return;
        }

        // Cycle through states: not completed → completed → skipped → not completed
        const update = getNextTrackerState(tracker);

        trackerUpdate.mutate(
            { id: tracker.id, update },
            {
                onSuccess: (data) => {
                    setTrackers(
                        trackers.map((t) => (t.id === tracker.id ? data : t))
                    );
                }
            }
        );
    };

    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    // render
    return (
        <tr
            key={habit.id}
            onMouseEnter={() => setRowIsActive(true)}
            onMouseLeave={() => setRowIsActive(false)}
            className='
            h-12
            align-middle
            '
        >
            <td
                className={`relative w-60 ${
                    rowIsActive ? 'bg-slate-800' : 'bg-slate-800/50'
                }`}
            >
                <Link
                    to={`details/${habit.id}`}
                    className='absolute inset-0 flex items-center'
                >
                    <Label
                        mainText={habit.name}
                        subText={
                            habit.frequency && habit.range
                                ? getFrequencyString(
                                      habit.frequency,
                                      habit.range
                                  )
                                : undefined
                        }
                        textColor={habit.color}
                    />
                </Link>
            </td>
            {dates.map((date) => (
                <td
                    className={`text-center ${
                        rowIsActive ? 'bg-slate-800' : 'bg-slate-800/50'
                    }`}
                    key={date.toISOString()}
                >
                    <TrackerCheckbox
                        status={getStatus(date)}
                        onClick={() => handleCheckboxClick(date)}
                    />
                </td>
            ))}
        </tr>
    );
};
