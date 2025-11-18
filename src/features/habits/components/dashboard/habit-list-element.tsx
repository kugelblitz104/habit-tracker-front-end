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
import { getFrequencyString } from '@/lib/date-utils';
import { Status } from '@/types/types';
import { Button } from '@headlessui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronsRight, Square } from 'lucide-react';
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
    const getIcon = (status: Status) => {
        switch (status) {
            case Status.COMPLETED:
                return <Check color='green' strokeWidth={3} />;
            case Status.SKIPPED:
                return <ChevronsRight color='lightblue' strokeWidth={3} />;
            case Status.NOT_COMPLETED:
            default:
                return <Square color='white' strokeWidth={1} />;
        }
    };

    return (
        <Button type='button' className='align-middle' onClick={onClick}>
            {getIcon(status)}
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
    const getTracker = (date: Date): TrackerRead | undefined => {
        return trackers.find(
            (tracker) => tracker.dated === date.toISOString().split('T')[0]
        );
    };

    const getStatus = (date: Date): Status => {
        const tracker = getTracker(date);

        if (!tracker) return Status.NOT_COMPLETED;
        if (tracker?.completed) return Status.COMPLETED;
        if (tracker?.skipped) return Status.SKIPPED;
        return Status.NOT_COMPLETED;
    };

    const handleCheckboxClick = (date: Date) => {
        const tracker = getTracker(date);

        if (!tracker) {
            // create tracker if it doesn't exist
            const newTracker = {
                habit_id: habit.id,
                dated: date.toISOString().split('T')[0],
                completed: true,
                skipped: false,
                note: ''
            };
            trackerCreate.mutate(newTracker, {
                onSuccess: (data) => {
                    setTrackers([...trackers, data]);
                }
            });
            return;
        }

        if (!tracker.completed && !tracker.skipped) {
            // toggle completed
            trackerUpdate.mutate(
                {
                    id: tracker.id,
                    update: {
                        completed: true,
                        skipped: false
                    }
                },
                {
                    onSuccess: (data) => {
                        setTrackers(
                            trackers.map((t) =>
                                t.id === tracker.id ? data : t
                            )
                        );
                    }
                }
            );
        } else if (tracker.completed) {
            // toggle skipped
            trackerUpdate.mutate(
                {
                    id: tracker.id,
                    update: {
                        completed: false,
                        skipped: true
                    }
                },
                {
                    onSuccess: (data) => {
                        setTrackers(
                            trackers.map((t) =>
                                t.id === tracker.id ? data : t
                            )
                        );
                    }
                }
            );
        } else if (tracker.skipped) {
            // toggle not completed
            trackerUpdate.mutate(
                {
                    id: tracker.id,
                    update: {
                        completed: false,
                        skipped: false
                    }
                },
                {
                    onSuccess: (data) => {
                        setTrackers(
                            trackers.map((t) =>
                                t.id === tracker.id ? data : t
                            )
                        );
                    }
                }
            );
        }
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
