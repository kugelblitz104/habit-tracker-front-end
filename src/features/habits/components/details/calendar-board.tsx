import type { HabitRead, TrackerCreate, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import { NoteDialog } from '@/features/habits/components/modals/note-dialog';
import { getTracker } from '@/features/trackers/api/get-trackers';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState,
    getTrackerDisplayStatus,
    getTrackerIcon,
    NotePip
} from '@/features/trackers/utils/tracker-utils';
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { useLongPress } from '@/lib/use-long-press';
import { TrackerStatus } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

type TrackerCellProps = {
    date: Date;
    tracker: TrackerLite | undefined;
    trackers: TrackerLite[];
    frequency: number;
    range: number;
    habitColor: string;
    onStatusClick: (date: Date) => void;
    onNoteClick: (date: Date, tracker: TrackerLite | undefined) => void;
    isToday: boolean;
    isCreatedDate: boolean;
    isLastRow?: boolean;
};

const TrackerCell = ({
    date,
    tracker,
    trackers,
    frequency,
    range,
    habitColor,
    onStatusClick,
    onNoteClick,
    isToday,
    isCreatedDate,
    isLastRow = false
}: TrackerCellProps) => {
    const displayStatus = getTrackerDisplayStatus(tracker, {
        date,
        trackers,
        frequency,
        range
    });
    const hasNote = tracker?.has_note || false;
    const longPressHandlers = useLongPress(() => onNoteClick(date, tracker));
    const ariaLabelState = displayStatus.replace('_', ' ');

    return (
        <td
            className={`
                relative p-2 ${isLastRow ? '' : 'border-b'} border-slate-700
                ${isToday ? 'bg-slate-700/50' : 'bg-slate-800/50'}
                hover:bg-slate-700
                transition-colors
                cursor-pointer
                select-none
            `}
            onClick={() => onStatusClick(date)}
            onContextMenu={(e) => {
                e.preventDefault();
                onNoteClick(date, tracker);
            }}
            {...longPressHandlers}
            aria-label={`Mark habit as ${ariaLabelState} for ${date.toLocaleDateString()}`}
        >
            <div className='flex items-center justify-center gap-1'>
                <div className='relative'>
                    {getTrackerIcon(displayStatus, habitColor)}
                    {isCreatedDate && (
                        <div className='absolute bottom-1 -left-5 pointer-events-none'>
                            <CalendarPlus size={12} color='lightgreen' />
                        </div>
                    )}
                    {hasNote && <NotePip className='absolute -top-1 -right-2' color={habitColor} />}
                </div>
            </div>
        </td>
    );
};

type CalendarBoardProps = {
    habit?: HabitRead;
    trackers: TrackerLite[];
    weeks: number;
    endDate: string; // ISO date string (YYYY-MM-DD)
    hasPrevious: boolean;
    isLoading?: boolean;
    subtitle?: string;
    onPageChange: (newEndDate: string) => void;
    onTrackerCreate: (tracker: TrackerCreate) => Promise<TrackerRead>;
    onTrackerUpdate: (id: number, update: TrackerUpdate) => Promise<TrackerRead>;
};

export const CalendarBoard = ({
    habit,
    trackers,
    weeks: weeksCount,
    endDate,
    hasPrevious,
    isLoading = false,
    subtitle = 'Calendar',
    onPageChange,
    onTrackerCreate,
    onTrackerUpdate
}: CalendarBoardProps) => {
    const DAYS_PER_WEEK = 7;
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTrackerId, setSelectedTrackerId] = useState<number | null>(null);

    // Fetch full tracker details when note dialog is opened
    const { data: selectedTrackerFull } = useQuery({
        queryKey: ['tracker', selectedTrackerId],
        queryFn: () => getTracker(selectedTrackerId!),
        enabled: !!selectedTrackerId && isNoteDialogOpen,
        staleTime: 0 // Always fetch fresh data for editing
    });

    // Parse endDate from string
    const endDateObj = useMemo(() => parseLocalDate(endDate), [endDate]);

    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    // Check if we're on the current page (endDate is today or in the future)
    const isCurrentPage = useMemo(() => {
        return endDateObj >= today;
    }, [endDateObj, today]);

    // Generate calendar weeks with dates based on endDate
    const weeks = useMemo(() => {
        const totalDays = weeksCount * DAYS_PER_WEEK;

        // If on current page, end with today and show future days of current week as null
        const effectiveEndDate = isCurrentPage ? today : endDateObj;
        const daysAfterEffectiveEnd = isCurrentPage ? 6 - today.getDay() : 0;

        // Generate past dates (oldest first)
        const dates = [...Array(totalDays - daysAfterEffectiveEnd).keys()]
            .map((day) => {
                const date = new Date(effectiveEndDate);
                date.setDate(effectiveEndDate.getDate() - day);
                return date;
            })
            .reverse();

        const weeksArray: (Date | null)[][] = [];

        // Fill complete past weeks
        for (let i = 0; i < weeksCount - 1; i++) {
            weeksArray.push(dates.slice(i * DAYS_PER_WEEK, (i + 1) * DAYS_PER_WEEK));
        }

        // Handle the last week with null for future days (only if on current page)
        const lastWeekDates = dates.slice((weeksCount - 1) * DAYS_PER_WEEK);
        const lastWeek: (Date | null)[] = [...lastWeekDates];

        if (isCurrentPage) {
            for (let i = 0; i < daysAfterEffectiveEnd; i++) {
                lastWeek.push(null);
            }
        }

        weeksArray.push(lastWeek);

        return weeksArray;
    }, [endDateObj, weeksCount, DAYS_PER_WEEK, isCurrentPage, today]);

    // Calculate date range for display
    const dateRangeLabel = useMemo(() => {
        const firstWeek = weeks[0];
        const lastWeek = weeks[weeks.length - 1];
        const firstDate = firstWeek?.find((d) => d !== null);
        const lastDate = [...(lastWeek || [])].reverse().find((d) => d !== null);

        if (!firstDate || !lastDate) return '';

        const formatDate = (date: Date) =>
            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
    }, [weeks]);

    // Navigation handlers
    const handlePreviousPage = useCallback(() => {
        const totalDays = weeksCount * DAYS_PER_WEEK;
        const newEndDate = new Date(endDateObj);
        newEndDate.setDate(newEndDate.getDate() - totalDays);
        onPageChange(toLocalDateString(newEndDate));
    }, [endDateObj, weeksCount, DAYS_PER_WEEK, onPageChange]);

    const handleNextPage = useCallback(() => {
        const totalDays = weeksCount * DAYS_PER_WEEK;
        const newEndDate = new Date(endDateObj);
        newEndDate.setDate(newEndDate.getDate() + totalDays);

        // Don't go past today
        if (newEndDate > today) {
            onPageChange(toLocalDateString(today));
        } else {
            onPageChange(toLocalDateString(newEndDate));
        }
    }, [endDateObj, weeksCount, DAYS_PER_WEEK, today, onPageChange]);

    const isToday = (date: Date): boolean => {
        return date.toDateString() === today.toDateString();
    };

    const isCreatedDate = (date: Date): boolean => {
        if (!habit || !habit.created_date) return false;
        const createdDate = new Date(habit.created_date);
        return date.toDateString() === createdDate.toDateString();
    };

    const handleStatusClick = (date: Date) => {
        if (!habit) return;

        const tracker = findTrackerByDate(trackers, date);

        if (!tracker) {
            // Create tracker if it doesn't exist
            const newTracker = createNewTracker(habit.id, date);
            onTrackerCreate(newTracker);
            return;
        }

        // Cycle through states: not completed → completed → skipped → not completed
        const update = getNextTrackerState(tracker);
        onTrackerUpdate(tracker.id, update);
    };

    const handleNoteClick = (date: Date, tracker: TrackerLite | undefined) => {
        setSelectedDate(date);
        setSelectedTrackerId(tracker?.id || null);
        setIsNoteDialogOpen(true);
    };

    const handleNoteSave = (note: string) => {
        if (!habit || !selectedDate) return;

        if (!selectedTrackerFull) {
            // Create tracker with note
            const newTracker = createNewTracker(
                habit.id,
                selectedDate,
                TrackerStatus.NOT_COMPLETED
            );
            newTracker.note = note;
            onTrackerCreate(newTracker);
        } else {
            // Update existing tracker's note
            const update: TrackerUpdate = { note: note };
            onTrackerUpdate(selectedTrackerFull.id, update);
        }
    };

    if (!habit) {
        return <div className='text-slate-400'>No habit selected</div>;
    }

    const weekHeaders = weeks.map((week, idx) => {
        const firstDate = week.find((d) => d !== null);
        const lastDate = [...week].reverse().find((d) => d !== null);

        return (
            <th
                key={idx}
                className='p-2 text-sm text-slate-400 font-normal border-b border-slate-700 min-w-30'
            >
                <div className='text-xs text-slate-500'>
                    {firstDate &&
                        firstDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        })}
                    {lastDate && lastDate !== firstDate && (
                        <>
                            {' - '}
                            {lastDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                            })}
                        </>
                    )}
                </div>
            </th>
        );
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <>
            <div className='mx-4 mt-4 mb-2 flex items-center justify-between'>
                {subtitle && (
                    <h2 className='text-lg font-semibold' style={{ color: habit.color }}>
                        {subtitle}
                    </h2>
                )}
                <div className='flex items-center gap-1'>
                    <button
                        onClick={handlePreviousPage}
                        className='p-1 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200'
                        aria-label='Previous page'
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className='text-sm text-slate-400 min-w-[140px] text-center'>
                        {isLoading ? 'Loading...' : dateRangeLabel}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={isCurrentPage}
                        className={`p-1 rounded transition-colors ${
                            isCurrentPage
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        aria-label='Next page'
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
            <div className='overflow-x-auto select-none mx-4 rounded-lg border border-slate-700'>
                <table className='w-full border-collapse'>
                    <colgroup>
                        <col className='w-20' />
                        {weeks.map((_, idx) => (
                            <col key={idx} className='min-w-30' />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th
                                className='p-2 
                                text-left text-sm text-slate-400 font-normal 
                                border-b border-r border-slate-700 
                                sticky left-0 bg-gray-950 z-10'
                            >
                                Day
                            </th>
                            {weekHeaders}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(DAYS_PER_WEEK).keys()].map((dayIndex) => (
                            <tr key={dayIndex}>
                                <td
                                    className={`p-2 text-sm text-slate-400 border-r bg-slate-800 sticky left-0 z-10 ${
                                        dayIndex < DAYS_PER_WEEK - 1 ? 'border-b' : ''
                                    } border-slate-700`}
                                >
                                    {dayLabels[dayIndex]}
                                </td>
                                {weeks.map((week, weekIndex) => {
                                    const date = week[dayIndex];
                                    const isLastRow = dayIndex === DAYS_PER_WEEK - 1;
                                    const borderClasses = isLastRow ? '' : 'border-b';

                                    if (!date) {
                                        // Empty cell for future days
                                        return (
                                            <td
                                                key={`${weekIndex}-${dayIndex}`}
                                                className={`p-2 ${borderClasses} border-slate-700 bg-slate-900/50`}
                                            />
                                        );
                                    }
                                    const tracker = findTrackerByDate(trackers, date);
                                    return (
                                        <TrackerCell
                                            key={`${weekIndex}-${dayIndex}`}
                                            date={date}
                                            tracker={tracker}
                                            trackers={trackers}
                                            frequency={habit.frequency}
                                            range={habit.range}
                                            habitColor={habit.color}
                                            onStatusClick={handleStatusClick}
                                            onNoteClick={handleNoteClick}
                                            isToday={isToday(date)}
                                            isCreatedDate={isCreatedDate(date)}
                                            isLastRow={isLastRow}
                                        />
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className='mx-4 mt-2 text-slate-500'>Right click to add or edit notes</div>
            <NoteDialog
                isOpen={isNoteDialogOpen}
                date={selectedDate || new Date()}
                note={selectedTrackerFull?.note || ''}
                onClose={() => setIsNoteDialogOpen(false)}
                onSave={handleNoteSave}
            />
        </>
    );
};
