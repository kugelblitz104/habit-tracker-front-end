import type { HabitRead, TrackerCreate, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import { NoteDialog } from '@/features/habits/components/modals/note-dialog';
import { getTracker } from '@/features/trackers/api/get-trackers';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState,
    getTrackerDisplayStatus,
    NotePip
} from '@/features/trackers/utils/tracker-utils';
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { useLongPress } from '@/lib/use-long-press';
import { DisplayStatus, TrackerStatus } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

type CalendarBoardProps = {
    habit?: HabitRead;
    /** Full tracker history (habit creation → today). */
    trackers: TrackerLite[];
    /** Profile preference: weeks render Monday-first (default) or Sunday-first. */
    weekStartMonday?: boolean;
    onTrackerCreate: (tracker: TrackerCreate) => Promise<TrackerRead>;
    onTrackerUpdate: (id: number, update: TrackerUpdate) => Promise<TrackerRead>;
};

const PANEL =
    'bg-[var(--habit-container-bg)] border border-[var(--habit-container-border)] rounded-card px-5 py-[18px]';
const TITLE =
    'm-0 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-habit-label)]';

// Weekday header rows for each week-start preference.
const WEEKDAY_HEADERS_MONDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_HEADERS_SUNDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const monthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

/** Background/border/text styling for a single calendar cell. */
const cellStyle = (status: DisplayStatus, isToday: boolean, isFuture: boolean): CSSProperties => {
    let style: CSSProperties;

    if (isFuture) {
        style = { background: 'rgba(255,255,255,.02)', color: '#454c53' };
    } else {
        switch (status) {
            case DisplayStatus.COMPLETED:
                style = {
                    background: 'var(--habit-detail-accent, #6f9dc0)',
                    color: '#0f1418',
                    fontWeight: 600
                };
                break;
            case DisplayStatus.AUTO_SKIPPED:
                style = {
                    background: 'var(--habit-auto-fill)',
                    border: '1px solid var(--habit-auto-border)',
                    color: '#9fc3dd'
                };
                break;
            case DisplayStatus.SKIPPED:
                // Dashed border + diagonal hatch — deliberately distinct from the
                // plain dark box of a missed/incomplete day.
                style = {
                    background:
                        'repeating-linear-gradient(45deg, rgba(120,168,205,.10) 0, rgba(120,168,205,.10) 2px, transparent 2px, transparent 5px), #20242a',
                    border: '1px dashed rgba(120,168,205,.5)',
                    color: '#8ba3b5'
                };
                break;
            case DisplayStatus.NOT_COMPLETED:
            default:
                style = { background: '#191d22', border: '1px solid #2a3138', color: '#565c63' };
                break;
        }
    }

    if (isToday) {
        style = {
            ...style,
            border: '2px solid var(--habit-detail-accent-bright, #8fc0e0)',
            // Give an otherwise-empty "today" cell a subtle highlight fill.
            ...(status === DisplayStatus.NOT_COMPLETED && !isFuture
                ? {
                      background:
                          'color-mix(in srgb, var(--habit-detail-accent-bright, #8fc0e0) 12%, transparent)',
                      color: '#d7e6f2',
                      fontWeight: 700
                  }
                : {})
        };
    }

    return style;
};

type DayCellProps = {
    date: Date;
    habit: HabitRead;
    trackers: TrackerLite[];
    isToday: boolean;
    isFuture: boolean;
    onStatusClick: (date: Date) => void;
    onNoteClick: (date: Date, tracker: TrackerLite | undefined) => void;
};

const DayCell = ({
    date,
    habit,
    trackers,
    isToday,
    isFuture,
    onStatusClick,
    onNoteClick
}: DayCellProps) => {
    const tracker = findTrackerByDate(trackers, date);
    const status = getTrackerDisplayStatus(tracker, {
        date,
        trackers,
        frequency: habit.frequency,
        range: habit.range
    });
    const longPressHandlers = useLongPress(() => {
        if (!isFuture) onNoteClick(date, tracker);
    });

    return (
        <div
            className={`relative flex select-none items-center justify-center rounded-cell text-[13px] transition-colors ${
                isFuture ? 'cursor-default' : 'cursor-pointer'
            }`}
            style={{ aspectRatio: '1', ...cellStyle(status, isToday, isFuture) }}
            onClick={() => !isFuture && onStatusClick(date)}
            onContextMenu={(e) => {
                e.preventDefault();
                if (!isFuture) onNoteClick(date, tracker);
            }}
            {...longPressHandlers}
            aria-label={`${date.toLocaleDateString()} — ${status.replace('_', ' ')}`}
        >
            {date.getDate()}
            {/* The pip follows the detail view's EFFECTIVE accent (habit color when
                use_habit_color_accent is on, the cool default otherwise) so it always
                matches the completed chips around it. The dashboard call site keeps
                passing habit.color to match ITS surroundings. */}
            {tracker?.has_note && (
                <NotePip
                    className='absolute -top-1 -right-1'
                    color='var(--habit-detail-accent, #6f9dc0)'
                />
            )}
        </div>
    );
};

const LegendSwatch = ({ label, style }: { label: string; style: CSSProperties }) => (
    <span className='inline-flex items-center gap-[6px] text-[10.5px] text-[#8ba3b5]'>
        <span className='h-[11px] w-[11px] rounded-[3px]' style={style} />
        {label}
    </span>
);

export const CalendarBoard = ({
    habit,
    trackers,
    weekStartMonday = true,
    onTrackerCreate,
    onTrackerUpdate
}: CalendarBoardProps) => {
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTrackerId, setSelectedTrackerId] = useState<number | null>(null);

    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const [viewMonth, setViewMonth] = useState<Date>(() => monthStart(new Date()));

    // Fetch full tracker details when the note dialog opens.
    const { data: selectedTrackerFull } = useQuery({
        queryKey: ['tracker', selectedTrackerId],
        queryFn: () => getTracker(selectedTrackerId!),
        enabled: !!selectedTrackerId && isNoteDialogOpen,
        staleTime: 0
    });

    const currentMonth = useMemo(() => monthStart(today), [today]);

    // Earliest reachable month: the habit's creation month, or — for imported
    // habits whose tracker history predates created_date — the earliest tracker's
    // month, whichever is older.
    const earliestMonth = useMemo(() => {
        const creationMonth = habit
            ? monthStart(parseLocalDate(habit.created_date.split('T')[0] ?? habit.created_date))
            : null;
        let earliest = creationMonth;
        for (const tracker of trackers) {
            if (!tracker.dated) continue;
            const trackerMonth = monthStart(parseLocalDate(tracker.dated));
            if (!earliest || trackerMonth < earliest) earliest = trackerMonth;
        }
        return earliest;
    }, [habit, trackers]);

    const hasPrevious = earliestMonth ? viewMonth > earliestMonth : false;
    const hasNext = viewMonth < currentMonth;

    // Build the grid: leading blank offset for the 1st's weekday, then each day.
    const { leadingBlanks, days } = useMemo(() => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        // JS getDay(): 0 = Sunday … 6 = Saturday. Sunday-first grids use it
        // directly; Monday-first grids rotate it so Monday = 0.
        const firstDay = new Date(year, month, 1).getDay();
        const firstWeekday = weekStartMonday ? (firstDay + 6) % 7 : firstDay;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysArr = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
        return { leadingBlanks: firstWeekday, days: daysArr };
    }, [viewMonth, weekStartMonday]);

    const goPrevious = () => {
        if (!hasPrevious) return;
        setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    };
    const goNext = () => {
        if (!hasNext) return;
        setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    };

    const handleStatusClick = (date: Date) => {
        if (!habit) return;
        const tracker = findTrackerByDate(trackers, date);
        if (!tracker) {
            onTrackerCreate(createNewTracker(habit.id, date));
            return;
        }
        onTrackerUpdate(tracker.id, getNextTrackerState(tracker));
    };

    const handleNoteClick = (date: Date, tracker: TrackerLite | undefined) => {
        setSelectedDate(date);
        setSelectedTrackerId(tracker?.id || null);
        setIsNoteDialogOpen(true);
    };

    const handleNoteSave = (note: string) => {
        if (!habit || !selectedDate) return;
        // Resolve the existing tracker for this date from the already-loaded lite
        // history (do NOT depend on the lazily-fetched full detail, which may not
        // have resolved yet — relying on it can create a duplicate for a date that
        // already has a tracker).
        const existingId = selectedTrackerId ?? findTrackerByDate(trackers, selectedDate)?.id ?? null;
        if (existingId === null) {
            const newTracker = createNewTracker(habit.id, selectedDate, TrackerStatus.NOT_COMPLETED);
            newTracker.note = note;
            onTrackerCreate(newTracker);
        } else {
            onTrackerUpdate(existingId, { note });
        }
    };

    if (!habit) {
        return <div className={`${PANEL} text-[#8ba3b5]`}>No habit selected</div>;
    }

    const isToday = (date: Date) => date.getTime() === today.getTime();
    const isFuture = (date: Date) => date.getTime() > today.getTime();

    const pagerBtn = (enabled: boolean) =>
        `inline-flex h-6 w-6 items-center justify-center rounded-[6px] border text-[13px] transition-colors ${
            enabled
                ? 'border-[rgba(120,168,205,.2)] text-[#8ba3b5] hover:bg-[var(--habit-container-bg)]'
                : 'border-[rgba(120,168,205,.12)] text-[#4a5966] cursor-not-allowed'
        }`;

    return (
        <div className={PANEL}>
            <div className='mb-[14px] flex items-center justify-between'>
                <h2 className={TITLE}>
                    {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className='flex items-center gap-[6px]'>
                    <button
                        type='button'
                        onClick={goPrevious}
                        disabled={!hasPrevious}
                        className={pagerBtn(hasPrevious)}
                        aria-label='Previous month'
                    >
                        ‹
                    </button>
                    <button
                        type='button'
                        onClick={goNext}
                        disabled={!hasNext}
                        className={pagerBtn(hasNext)}
                        aria-label='Next month'
                    >
                        ›
                    </button>
                </div>
            </div>

            <div className='mb-[6px] grid grid-cols-7 gap-[6px]'>
                {(weekStartMonday ? WEEKDAY_HEADERS_MONDAY : WEEKDAY_HEADERS_SUNDAY).map(
                    (label, i) => (
                        <span key={i} className='text-center font-mono text-[10px] text-[#5f7688]'>
                            {label}
                        </span>
                    )
                )}
            </div>

            <div className='grid grid-cols-7 gap-[6px]'>
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <span key={`blank-${i}`} />
                ))}
                {days.map((date) => (
                    <DayCell
                        key={toLocalDateString(date)}
                        date={date}
                        habit={habit}
                        trackers={trackers}
                        isToday={isToday(date)}
                        isFuture={isFuture(date)}
                        onStatusClick={handleStatusClick}
                        onNoteClick={handleNoteClick}
                    />
                ))}
            </div>

            <div className='mt-[14px] flex flex-wrap gap-3'>
                <LegendSwatch
                    label='Completed'
                    style={{ background: 'var(--habit-detail-accent, #6f9dc0)' }}
                />
                <LegendSwatch
                    label='Auto-kept'
                    style={{
                        background: 'var(--habit-auto-fill)',
                        border: '1px solid var(--habit-auto-border)'
                    }}
                />
                <LegendSwatch
                    label='Skipped'
                    style={{
                        background:
                            'repeating-linear-gradient(45deg, rgba(120,168,205,.10) 0, rgba(120,168,205,.10) 2px, transparent 2px, transparent 5px), #20242a',
                        border: '1px dashed rgba(120,168,205,.5)'
                    }}
                />
                <LegendSwatch
                    label='Missed'
                    style={{ background: '#191d22', border: '1px solid #2a3138' }}
                />
            </div>
            <div className='mt-[10px] font-mono text-[10.5px] text-[#5f7688]'>
                Tap any day to set or backdate its status
            </div>

            <NoteDialog
                isOpen={isNoteDialogOpen}
                date={selectedDate || new Date()}
                note={selectedTrackerFull?.note || ''}
                onClose={() => setIsNoteDialogOpen(false)}
                onSave={handleNoteSave}
            />
        </div>
    );
};
