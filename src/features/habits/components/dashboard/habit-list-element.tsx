import type { HabitRead, TrackerLite } from '@/api';
import { Label } from '@/components/ui/label';
import {
    findTrackerByDate,
    getDisplayStatusForDate,
    getTrackerIcon,
    NotePip,
    trackerStatusLabel,
    trackerStatusToken
} from '@/features/trackers/utils/tracker-utils';
import { getFrequencyString } from '@/features/habits/utils/frequency-label';
import type { HabitRowData } from '@/features/habits/utils/habit-row-data';
import { useLongPress } from '@/lib/use-long-press';
import { DisplayStatus } from '@/types/types';
import { Button } from '@headlessui/react';
import { Flame } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { habitDetailPath } from '@/lib/entity-ref';

export type HabitListElementProps = {
    habit: HabitRead;
    days: number;
    filterIncomplete?: boolean;
    isSmall?: boolean;
    /** Wide (lg/xl) master-detail: name clicks open the pane instead of navigating. */
    isWide?: boolean;
    isSelected?: boolean;
    onSelectHabit?: (habitId: number) => void;
    onNoteOpen?: (habitId: number, date: Date, tracker: TrackerLite | undefined) => void;
    /** Everything this row renders, derived once by the list. */
    row: HabitRowData;
    onToggle: (habitId: number, date: Date) => void;
};

export const HabitListElement = ({
    habit,
    days,
    filterIncomplete = false,
    isSmall = false,
    isWide = false,
    isSelected = false,
    onSelectHabit,
    onNoteOpen,
    row,
    onToggle
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
    const currentDateRef = useRef<Date | null>(null);

    const handleNoteClick = (date: Date) => {
        const tracker = findTrackerByDate(row.trackers, date);
        onNoteOpen?.(habit.id, date, tracker);
    };

    const longPressHandlers = useLongPress(() => {
        if (currentDateRef.current) {
            handleNoteClick(currentDateRef.current);
        }
    });

    const getStatus = (date: Date): DisplayStatus =>
        getDisplayStatusForDate(row.trackers, date, habit, row.autoSkippedDates);

    // Whether this habit is visible under the current filter: when the incomplete
    // filter is active, a habit that is completed or auto-skipped for today is hidden.
    const isVisible = !(
        filterIncomplete &&
        (row.status === DisplayStatus.COMPLETED || row.status === DisplayStatus.AUTO_SKIPPED)
    );

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
                    to={habitDetailPath(habit)}
                    state={{ from: '/habits' }}
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
                        {row.streak > 0 ? (
                            <>
                                <Flame
                                    size={15}
                                    className='stroke-[var(--color-habit-accent)]'
                                    style={{ fill: 'rgba(127,168,201,.35)' }}
                                />
                                <span className='font-mono text-[12px] text-[var(--color-habit-accent)]'>
                                    {row.streak}
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
                const tracker = findTrackerByDate(row.trackers, date);
                return (
                    <td className='relative text-center' key={date.toISOString()}>
                        <Button
                            className='w-full h-12 flex items-center justify-center select-none'
                            aria-label={`${habit.name}, ${date.toLocaleDateString()}: ${trackerStatusLabel(status)}`}
                            data-status={trackerStatusToken(status)}
                            onClick={() => onToggle(habit.id, date)}
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
                            <NotePip className='absolute right-1.5 top-1.5' color={habit.color} />
                        )}
                    </td>
                );
            })}
        </tr>
    );
};
