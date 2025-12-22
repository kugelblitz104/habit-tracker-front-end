import type { HabitRead, TrackerCreate, TrackerRead, TrackerUpdate } from '@/api';
import { Label } from '@/components/ui/label';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackers } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { calculateStreaks, getCurrentStreakLength } from '@/features/trackers/utils/kpi-utils';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

export type HabitListElementProps = {
    habit: HabitRead;
    days: number;
    filterIncomplete?: boolean;
    onStreakChange?: (habitId: number, streak: number) => void;
    onNoteOpen?: (habitId: number, date: Date, tracker: TrackerRead | undefined) => void;
};

export const HabitListElement = ({
    habit,
    days,
    filterIncomplete = false,
    onStreakChange,
    onNoteOpen
}: HabitListElementProps) => {
    // useMemo to prevent hydration mismatch
    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const dates = useMemo(() => {
        return [...Array(days).keys()].map((day) => {
            const date = new Date(today);
            date.setDate(today.getDate() - day);
            return date;
        });
    }, [days, today]);

    const [rowIsActive, setRowIsActive] = useState<boolean>(false);
    const [trackers, setTrackers] = useState<TrackerRead[]>([]);
    const queryClient = useQueryClient();
    const trackersQuery = useQuery({
        queryKey: ['trackers', { habitId: habit.id }, days],
        queryFn: () => getTrackers(habit.id, days),
        staleTime: 1000 * 60 // 1 minute
    });

    const currentStreak = useMemo(() => {
        if (!habit || trackers.length === 0) return 0;
        const habitStreaks = calculateStreaks(
            trackers,
            habit.frequency,
            habit.range,
            habit.created_date
        );
        return getCurrentStreakLength(habitStreaks);
    }, [habit, trackers]);

    // Report streak changes to parent for sorting purposes
    useEffect(() => {
        onStreakChange?.(habit.id, currentStreak);
    }, [habit.id, currentStreak, onStreakChange]);

    const trackerCreate = useMutation({
        mutationFn: (tracker: TrackerCreate) => createTracker(tracker),
        onSuccess: async (data) => {
            // Optimistically update ALL tracker caches for this habit (any days value)
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: habit.id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    // Only add if not already present
                    if (oldData.trackers.some((t) => t.id === data.id)) return oldData;
                    return {
                        ...oldData,
                        trackers: [...oldData.trackers, data]
                    };
                }
            );
        },
        onError: (error) => {
            console.error('Error adding tracker:', error);
        }
    });

    const trackerUpdate = useMutation({
        mutationFn: ({ id, update }: { id: number; update: TrackerUpdate }) =>
            updateTracker(id, update),
        onSuccess: async (data) => {
            // Optimistically update ALL tracker caches for this habit (any days value)
            queryClient.setQueriesData<{ trackers: TrackerRead[] }>(
                { queryKey: ['trackers', { habitId: habit.id }] },
                (oldData) => {
                    if (!oldData?.trackers) return oldData;
                    return {
                        ...oldData,
                        trackers: oldData.trackers.map((t) => (t.id === data.id ? data : t))
                    };
                }
            );
        },
        onError: (error) => {
            console.error('Error updating tracker:', error);
        }
    });

    // functions
    const getStatus = (date: Date): Status => {
        const tracker = findTrackerByDate(trackers, date);
        return getTrackerStatus(tracker, {
            date,
            trackers,
            frequency: habit.frequency,
            range: habit.range
        });
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
                    setTrackers(trackers.map((t) => (t.id === tracker.id ? data : t)));
                }
            }
        );
    };

    const handleNoteClick = (date: Date) => {
        const tracker = findTrackerByDate(trackers, date);
        onNoteOpen?.(habit.id, date, tracker);
    };

    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    // Get today's status for filtering
    const todayStatus = getStatus(today);

    // If filtering for incomplete and today is completed, skipped, or auto-skipped, hide this habit
    if (
        filterIncomplete &&
        (todayStatus === Status.COMPLETED || todayStatus === Status.AUTO_SKIPPED)
    ) {
        return null;
    }

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
            <td className={`relative ${rowIsActive ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                <Link
                    to={`details/${habit.id}`}
                    className='absolute inset-0 flex items-center cursor-pointer px-2'
                >
                    <Label
                        mainText={habit.name}
                        subText={getFrequencyString(habit.frequency, habit.range)}
                        textColor={habit.color}
                        className='cursor-pointer'
                    />
                </Link>
            </td>
            <td className={`text-center ${rowIsActive ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                <div className='flex items-center justify-center gap-0.5'>
                    {currentStreak > 0 ? (
                        <Flame size={16} className='stroke-orange-500 fill-orange-400' />
                    ) : (
                        '-'
                    )}
                    <span className='text-orange-400'>
                        {currentStreak > 0 ? currentStreak : ''}
                    </span>
                </div>
            </td>
            {dates.map((date) => (
                <td
                    className={`text-center hover:bg-slate-600 ${
                        rowIsActive ? 'bg-slate-800' : 'bg-slate-800/50'
                    }`}
                    key={date.toISOString()}
                >
                    <Button
                        className='w-full h-12 flex items-center justify-center select-none'
                        onClick={() => handleCheckboxClick(date)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            handleNoteClick(date);
                        }}
                    >
                        {getTrackerIcon(getStatus(date), habit.color)}
                    </Button>
                </td>
            ))}
        </tr>
    );
};
