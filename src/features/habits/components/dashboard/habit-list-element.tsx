import type { HabitRead, TrackerLite } from '@/api';
import { Label } from '@/components/ui/label';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import {
    toTrackerLite,
    useTrackerMutations
} from '@/features/trackers/hooks/use-tracker-mutations';
import { calculateStreaks, getCurrentStreakLength } from '@/features/trackers/utils/kpi-utils';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState,
    getTrackerDisplayStatus,
    getTrackerIcon,
    NotePip
} from '@/features/trackers/utils/tracker-utils';
import { getFrequencyString } from '@/lib/date-utils';
import { useLongPress } from '@/lib/use-long-press';
import { DisplayStatus } from '@/types/types';
import { Button } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';

export type HabitListElementProps = {
    habit: HabitRead;
    days: number;
    filterIncomplete?: boolean;
    isSmall?: boolean;
    /** Wide (lg/xl) master-detail: name clicks open the pane instead of navigating. */
    isWide?: boolean;
    isSelected?: boolean;
    onSelectHabit?: (habitId: number) => void;
    onStreakChange?: (habitId: number, streak: number) => void;
    onVisibilityChange?: (habitId: number, visible: boolean) => void;
    onNoteOpen?: (habitId: number, date: Date, tracker: TrackerLite | undefined) => void;
};

export const HabitListElement = ({
    habit,
    days,
    filterIncomplete = false,
    isSmall = false,
    isWide = false,
    isSelected = false,
    onSelectHabit,
    onStreakChange,
    onVisibilityChange,
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
    const [trackers, setTrackers] = useState<TrackerLite[]>([]);
    const currentDateRef = useRef<Date | null>(null);

    // Shared optimistic mutations; unlike the Today panel's use-tracker-toggle
    // this surface intentionally skips cache invalidation and error toasts.
    const { trackerCreate, trackerUpdate } = useTrackerMutations(habit.id);

    const handleNoteClick = (date: Date) => {
        const tracker = findTrackerByDate(trackers, date);
        onNoteOpen?.(habit.id, date, tracker);
    };

    const longPressHandlers = useLongPress(() => {
        if (currentDateRef.current) {
            handleNoteClick(currentDateRef.current);
        }
    });

    const trackersQuery = useQuery({
        queryKey: ['trackers-lite', { habitId: habit.id }, days],
        queryFn: () => getTrackersLite(habit.id, undefined, days),
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

    // functions
    const getStatus = (date: Date): DisplayStatus => {
        const tracker = findTrackerByDate(trackers, date);
        return getTrackerDisplayStatus(tracker, {
            date,
            trackers: trackers as any, // TrackerLite[] is compatible for auto-skip checking
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
                onSuccess: (data) => setTrackers([...trackers, toTrackerLite(data)])
            });
            return;
        }

        // Cycle through states: not completed → completed → skipped → not completed
        const update = getNextTrackerState(tracker);

        trackerUpdate.mutate(
            { id: tracker.id, update },
            {
                onSuccess: (data) =>
                    setTrackers(trackers.map((t) => (t.id === tracker.id ? toTrackerLite(data) : t)))
            }
        );
    };

    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    // Get today's status for filtering
    const todayStatus = getStatus(today);

    // Whether this habit is visible under the current filter: when the incomplete
    // filter is active, a habit that is completed or auto-skipped for today is hidden.
    const isVisible = !(
        filterIncomplete &&
        (todayStatus === DisplayStatus.COMPLETED || todayStatus === DisplayStatus.AUTO_SKIPPED)
    );

    // Report visibility to the parent so it can show an empty state when nothing is
    // visible. This effect must run even in the render path that returns null below,
    // so it lives above the early return (hooks must run unconditionally).
    useEffect(() => {
        onVisibilityChange?.(habit.id, isVisible);
    }, [habit.id, isVisible, onVisibilityChange]);

    // If filtering for incomplete and today is completed, skipped, or auto-skipped, hide this habit
    if (!isVisible) {
        return null;
    }

    // On wide screens the name opens the master-detail pane in place; otherwise the
    // Link navigates to the full-page detail route (narrow / deep-link / refresh).
    const handleNameClick = (e: MouseEvent<HTMLAnchorElement>) => {
        if (isWide && onSelectHabit) {
            e.preventDefault();
            onSelectHabit(habit.id);
        }
    };

    // render
    return (
        <tr
            key={habit.id}
            onMouseEnter={() => setRowIsActive(true)}
            onMouseLeave={() => setRowIsActive(false)}
            className={`h-12 border-b border-[rgba(120,168,205,.08)] align-middle transition-colors ${
                isSelected
                    ? 'bg-[rgba(120,168,205,.10)]'
                    : rowIsActive
                    ? 'bg-[rgba(120,168,205,.07)]'
                    : ''
            }`}
        >
            <td className='relative'>
                <Link
                    to={`/details/${habit.id}`}
                    state={{ from: 'habits' }}
                    onClick={handleNameClick}
                    className='absolute inset-0 flex items-center cursor-pointer px-4'
                >
                    <Label
                        mainText={habit.name}
                        subText={
                            !isSmall ? getFrequencyString(habit.frequency, habit.range) : undefined
                        }
                        textColor={habit.color}
                        className='cursor-pointer'
                    />
                </Link>
            </td>
            {!isSmall && (
                <td className='text-center'>
                    <div className='flex items-center justify-center gap-1'>
                        {currentStreak > 0 ? (
                            <>
                                <Flame
                                    size={15}
                                    className='stroke-[var(--color-habit-accent)]'
                                    style={{ fill: 'rgba(127,168,201,.35)' }}
                                />
                                <span className='font-mono text-[12px] text-[var(--color-habit-accent)]'>
                                    {currentStreak}
                                </span>
                            </>
                        ) : (
                            <span className='text-[#5f7688]'>–</span>
                        )}
                    </div>
                </td>
            )}
            {dates.map((date) => {
                const status = getStatus(date);
                const tracker = findTrackerByDate(trackers, date);
                return (
                    <td className='relative text-center' key={date.toISOString()}>
                        <Button
                            className='w-full h-12 flex items-center justify-center select-none'
                            aria-label={`Mark habit ${habit.name} as ${getNextTrackerState(
                                tracker
                            )} for ${date.toLocaleDateString()}`}
                            onClick={() => handleCheckboxClick(date)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                handleNoteClick(date);
                            }}
                            onTouchStart={(e) => {
                                currentDateRef.current = date;
                                longPressHandlers.onTouchStart(e);
                            }}
                            onTouchMove={longPressHandlers.onTouchMove}
                            onTouchEnd={longPressHandlers.onTouchEnd}
                        >
                            <span
                                aria-hidden='true'
                                className='flex h-7 w-7 items-center justify-center rounded-cell transition-[filter] hover:brightness-125'
                            >
                                {getTrackerIcon(status, habit.color)}
                            </span>
                        </Button>
                        {tracker?.has_note && (
                            <NotePip
                                className='absolute right-1.5 top-1.5'
                                color={habit.color}
                            />
                        )}
                    </td>
                );
            })}
        </tr>
    );
};
