import type { HabitRead, TrackerLite } from '@/api';
import { Label } from '@/components/ui/label';
import { useHabitListItem } from '@/features/habits/hooks/use-habit-list-item';
import {
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
import { Flame } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';

export type HabitListElementProps = {
    habit: HabitRead;
    days: number;
    filterIncomplete?: boolean;
    isSmall?: boolean;
    onStreakChange?: (habitId: number, streak: number) => void;
    onNoteOpen?: (habitId: number, date: Date, tracker: TrackerLite | undefined) => void;
};

export const HabitListElement = ({
    habit,
    days,
    filterIncomplete = false,
    isSmall = false,
    onStreakChange,
    onNoteOpen
}: HabitListElementProps) => {
    const { trackers, currentStreak, handleCheckboxClick, isLoading } = useHabitListItem(
        habit,
        days
    );

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
    const currentDateRef = useRef<Date | null>(null);

    const handleNoteClick = (date: Date) => {
        const tracker = findTrackerByDate(trackers, date);
        onNoteOpen?.(habit.id, date, tracker);
    };

    const longPressHandlers = useLongPress(() => {
        if (currentDateRef.current) {
            handleNoteClick(currentDateRef.current);
        }
    });

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

    // Get today's status for filtering
    const todayStatus = getStatus(today);

    // If filtering for incomplete and today is completed, skipped, or auto-skipped, hide this habit
    if (
        filterIncomplete &&
        (todayStatus === DisplayStatus.COMPLETED || todayStatus === DisplayStatus.AUTO_SKIPPED)
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
                        subText={
                            !isSmall ? getFrequencyString(habit.frequency, habit.range) : undefined
                        }
                        textColor={habit.color}
                        className='cursor-pointer'
                    />
                </Link>
            </td>
            {!isSmall && (
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
            )}
            {dates.map((date) => (
                <td
                    className={`text-center hover:bg-slate-600 relative ${
                        rowIsActive ? 'bg-slate-800' : 'bg-slate-800/50'
                    }`}
                    key={date.toISOString()}
                >
                    <Button
                        className='w-full h-12 flex items-center justify-center select-none'
                        aria-label={`Mark habit ${habit.name} as ${getNextTrackerState(
                            findTrackerByDate(trackers, date)
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
                        {getTrackerIcon(getStatus(date), habit.color)}
                    </Button>
                    {findTrackerByDate(trackers, date)?.has_note && (
                        <NotePip
                            className='absolute top-1/2 left-1/2 -translate-y-4 translate-x-2.5'
                            color={habit.color}
                        />
                    )}
                </td>
            ))}
        </tr>
    );
};
