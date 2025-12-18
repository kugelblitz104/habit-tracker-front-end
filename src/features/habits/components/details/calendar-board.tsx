import type { HabitRead, TrackerCreate, TrackerRead, TrackerUpdate } from '@/api';
import { ActionButton, ButtonVariant } from '@/components/ui/buttons/action-button';
import { BaseModal } from '@/components/ui/modals/base-modal';
import {
    createNewTracker,
    findTrackerByDate,
    getNextTrackerState,
    getTrackerIcon,
    getTrackerStatus
} from '@/features/trackers/utils/tracker-utils';
import { sanitizeMultilineText, validationPatterns } from '@/lib/input-sanitization';
import { Field, Label, Textarea } from '@headlessui/react';
import { CalendarPlus, MessageSquare, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

type TrackerCellProps = {
    date: Date;
    tracker: TrackerRead | undefined;
    trackers: TrackerRead[];
    frequency: number;
    range: number;
    habitColor: string;
    onStatusClick: (date: Date) => void;
    onNoteClick: (date: Date, tracker: TrackerRead | undefined) => void;
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
    const status = getTrackerStatus(tracker, {
        date,
        trackers,
        frequency,
        range
    });
    const hasNote = tracker?.note && tracker.note.trim().length > 0;

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
        >
            <div className='flex items-center justify-center gap-1'>
                <div className='relative'>
                    {getTrackerIcon(status, habitColor)}
                    {isCreatedDate && (
                        <div className='absolute bottom-1 -left-5 pointer-events-none'>
                            <CalendarPlus size={12} color='lightgreen' />
                        </div>
                    )}
                    {hasNote && (
                        <div className='absolute -top-0 -right-4.5 pointer-events-none'>
                            <MessageSquare size={12} color='orange' fill='orange' />
                        </div>
                    )}
                </div>
            </div>
        </td>
    );
};

type NoteDialogProps = {
    isOpen: boolean;
    date: Date;
    note: string;
    onClose: () => void;
    onSave: (note: string) => void;
};

interface INoteFormInput {
    note: string;
}

const NoteDialog = ({ isOpen, date, note, onClose, onSave }: NoteDialogProps) => {
    const methods = useForm<INoteFormInput>({
        values: {
            note: note
        }
    });

    const errors = methods.formState.errors;

    useEffect(() => {
        methods.reset({ note });
    }, [methods.reset, note]);

    const onSubmit: SubmitHandler<INoteFormInput> = (data) => {
        const sanitizedNote = sanitizeMultilineText(data.note);
        onSave(sanitizedNote);
        methods.reset({ note });
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={() => {
                methods.reset({ note });
                onClose();
            }}
            title={`Add Note for ${date.toLocaleDateString()}`}
        >
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <Field className='mb-2'>
                        <Label className='sr-only'>Note</Label>
                        <Textarea
                            {...methods.register('note', validationPatterns.notes)}
                            className={`w-full h-32 p-2 bg-slate-700 border rounded-md resize-none ${
                                errors.note ? 'border-red-500' : 'border-slate-600'
                            }`}
                            placeholder='Enter your note here...'
                        />
                        {errors.note && (
                            <span className='text-red-400 text-sm mt-1 block'>
                                {errors.note.message as string}
                            </span>
                        )}
                    </Field>
                    <div className='flex gap-2 justify-end'>
                        <ActionButton
                            label='Cancel'
                            onClick={onClose}
                            icon={<X />}
                            variant={ButtonVariant.Primary}
                        />
                        <ActionButton
                            label='Save'
                            onClick={methods.handleSubmit(onSubmit)}
                            icon={<Save />}
                            variant={ButtonVariant.Submit}
                        />
                    </div>
                </form>
            </FormProvider>
        </BaseModal>
    );
};

type CalendarBoardProps = {
    habit?: HabitRead;
    trackers: TrackerRead[];
    totalDays: number;
    subtitle?: string;
    onTrackerCreate: (tracker: TrackerCreate) => Promise<TrackerRead>;
    onTrackerUpdate: (id: number, update: TrackerUpdate) => Promise<TrackerRead>;
};

export const CalendarBoard = ({
    habit,
    trackers,
    totalDays,
    subtitle = 'Calendar',
    onTrackerCreate,
    onTrackerUpdate
}: CalendarBoardProps) => {
    const DAYS_PER_WEEK = 7;
    const WEEKS = Math.ceil(totalDays / DAYS_PER_WEEK);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTracker, setSelectedTracker] = useState<TrackerRead | undefined>(undefined);

    // auto scroll to the right on initial load
    const scrollRef = (node: HTMLDivElement) => {
        if (node) {
            node.scrollLeft = node.scrollWidth;
        }
    };

    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    // Generate calendar weeks with dates
    const weeks = useMemo(() => {
        const daysAfterToday = 6 - today.getDay(); // Days until Saturday

        // Generate past dates (oldest first)
        const dates = [...Array(totalDays - daysAfterToday).keys()]
            .map((day) => {
                const date = new Date(today);
                date.setDate(today.getDate() - day);
                return date;
            })
            .reverse();

        const weeksArray: (Date | null)[][] = [];

        // Fill complete past weeks
        for (let i = 0; i < WEEKS - 1; i++) {
            weeksArray.push(dates.slice(i * DAYS_PER_WEEK, (i + 1) * DAYS_PER_WEEK));
        }

        // Handle the current week (last week) with null for future days
        const currentWeekDates = dates.slice((WEEKS - 1) * DAYS_PER_WEEK);
        const currentWeek: (Date | null)[] = [...currentWeekDates];

        for (let i = 0; i < daysAfterToday; i++) {
            currentWeek.push(null);
        }

        weeksArray.push(currentWeek);

        return weeksArray;
    }, [today, WEEKS, DAYS_PER_WEEK, totalDays]);

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

    const handleNoteClick = (date: Date, tracker: TrackerRead | undefined) => {
        setSelectedDate(date);
        setSelectedTracker(tracker);
        setIsNoteDialogOpen(true);
    };

    const handleNoteSave = (note: string) => {
        if (!habit || !selectedDate) return;

        if (!selectedTracker) {
            // Create tracker with note
            const newTracker = createNewTracker(habit.id, selectedDate, false);
            newTracker.note = note;
            onTrackerCreate(newTracker);
        } else {
            // Update existing tracker's note
            const update: TrackerUpdate = { note: note };
            onTrackerUpdate(selectedTracker.id, update);
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
                className='p-2 text-sm text-slate-400 font-normal border-b border-slate-700'
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
            {subtitle && (
                <h2 className='mx-4 mt-4 mb-2 text-lg font-semibold' style={{ color: habit.color }}>
                    {subtitle}
                </h2>
            )}
            <div
                className='overflow-x-auto select-none mx-4 rounded-lg border border-slate-700'
                ref={scrollRef}
            >
                <table className='w-full border-collapse table-fixed min-w-max'>
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
                <NoteDialog
                    isOpen={isNoteDialogOpen}
                    date={selectedDate || new Date()}
                    note={selectedTracker?.note || ''}
                    onClose={() => setIsNoteDialogOpen(false)}
                    onSave={handleNoteSave}
                />
            </div>
            <div className='mx-4 mt-1 text-slate-500'>Right click to add or edit notes</div>
        </>
    );
};
