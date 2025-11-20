import type {
    HabitRead,
    TrackerCreate,
    TrackerRead,
    TrackerUpdate
} from '@/api';
import {
    ActionButton,
    ButtonVariant
} from '@/components/ui/buttons/action-button';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { getTrackers } from '@/features/trackers/api/get-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import {
    createNewTracker,
    getNextTrackerState,
    getTrackerIcon,
    getTrackerStatus
} from '@/features/trackers/utils/tracker-utils';
import {
    sanitizeMultilineText,
    validationPatterns
} from '@/lib/input-sanitization';
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Field,
    Label,
    Textarea
} from '@headlessui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageSquare, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

type TrackerCellProps = {
    date: Date;
    tracker: TrackerRead | undefined;
    onStatusClick: (date: Date) => void;
    onNoteClick: (date: Date, tracker: TrackerRead | undefined) => void;
    isToday: boolean;
};

const TrackerCell = ({
    date,
    tracker,
    onStatusClick,
    onNoteClick,
    isToday
}: TrackerCellProps) => {
    const status = getTrackerStatus(tracker);
    const hasNote = tracker?.note && tracker.note.trim().length > 0;

    return (
        <td
            className={`
                relative p-2 border border-slate-700
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
                {getTrackerIcon(status)}
                {hasNote && (
                    <div className='absolute top-1 right-1 pointer-events-none'>
                        <MessageSquare
                            className='w-3 h-3'
                            color='orange'
                            fill='orange'
                        />
                    </div>
                )}
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

const NoteDialog = ({
    isOpen,
    date,
    note,
    onClose,
    onSave
}: NoteDialogProps) => {
    const methods = useForm<INoteFormInput>({
        values: {
            note: note
        }
    });

    const errors = methods.formState.errors;

    useEffect(() => {
        methods.reset({ note });
    }, [note, methods]);

    const onSubmit: SubmitHandler<INoteFormInput> = (data) => {
        const sanitizedNote = sanitizeMultilineText(data.note);
        onSave(sanitizedNote);
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
            <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
            <div className='fixed inset-0 flex items-center justify-center p-4'>
                <DialogPanel className='bg-slate-800 rounded-lg p-6 max-w-md w-full'>
                    <DialogTitle className='text-1xl font-bold mb-4'>
                        Add Note for {date.toLocaleDateString()}
                    </DialogTitle>
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <Field className='mb-2'>
                                <Label className='sr-only'>Note</Label>
                                <Textarea
                                    {...methods.register(
                                        'note',
                                        validationPatterns.notes
                                    )}
                                    className={`w-full h-32 p-2 bg-slate-700 border rounded-md resize-none ${
                                        errors.note
                                            ? 'border-red-500'
                                            : 'border-slate-600'
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
                </DialogPanel>
            </div>
        </Dialog>
    );
};

type CalendarBoardProps = {
    habit?: HabitRead;
};

export const CalendarBoard = ({ habit }: CalendarBoardProps) => {
    const WEEKS = 10;
    const DAYS_PER_WEEK = 7;
    const TOTAL_DAYS = WEEKS * DAYS_PER_WEEK;

    const [trackers, setTrackers] = useState<TrackerRead[]>([]);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTracker, setSelectedTracker] = useState<
        TrackerRead | undefined
    >(undefined);

    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    // Generate dates for last 10 weeks
    const dates = useMemo(() => {
        return [...Array(TOTAL_DAYS).keys()]
            .map((day) => {
                const date = new Date(today);
                date.setDate(today.getDate() - day);
                return date;
            })
            .reverse(); // Oldest first
    }, [today, TOTAL_DAYS]);

    // Organize dates into weeks (columns)
    const weeks = useMemo(() => {
        const weeksArray: Date[][] = [];
        for (let i = 0; i < WEEKS; i++) {
            weeksArray.push(
                dates.slice(i * DAYS_PER_WEEK, (i + 1) * DAYS_PER_WEEK)
            );
        }
        return weeksArray;
    }, [dates, WEEKS, DAYS_PER_WEEK]);

    const trackersQuery = useQuery({
        queryKey: ['trackers', { habitId: habit?.id }],
        queryFn: () => getTrackers(habit!.id, TOTAL_DAYS),
        enabled: !!habit,
        staleTime: 1000 * 60
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

    useEffect(() => {
        if (trackersQuery.data?.trackers) {
            setTrackers(trackersQuery.data.trackers);
        }
    }, [trackersQuery.data]);

    const getTracker = (date: Date): TrackerRead | undefined => {
        return trackers.find(
            (tracker) => tracker.dated === date.toISOString().split('T')[0]
        );
    };

    const isToday = (date: Date): boolean => {
        return date.toDateString() === today.toDateString();
    };

    const handleStatusClick = (date: Date) => {
        if (!habit) return;

        const tracker = getTracker(date);

        if (!tracker) {
            // Create tracker if it doesn't exist
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
            trackerCreate.mutate(newTracker, {
                onSuccess: (data) => {
                    setTrackers([...trackers, data]);
                }
            });
        } else {
            // Update existing tracker's note
            const update: TrackerUpdate = { note: note };
            trackerUpdate.mutate(
                { id: selectedTracker.id, update },
                {
                    onSuccess: (data) => {
                        setTrackers(
                            trackers.map((t) =>
                                t.id === selectedTracker.id ? data : t
                            )
                        );
                    }
                }
            );
        }
    };

    if (!habit) {
        return <div className='text-slate-400'>No habit selected</div>;
    }

    const weekHeaders = weeks.map((week, idx) => {
        const firstDate = week[0];
        const lastDate = week[week.length - 1];
        if (!firstDate || !lastDate) return null;
        return (
            <th
                key={idx}
                className='p-2 text-sm text-slate-400 font-normal border border-slate-700'
            >
                <div className='text-xs text-slate-500'>
                    {firstDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })}{' '}
                    -{' '}
                    {lastDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })}
                </div>
            </th>
        );
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className='overflow-x-auto select-none'>
            <table className='w-full border-collapse table-fixed'>
                <colgroup>
                    <col className='w-20' />
                    {weeks.map((_, idx) => (
                        <col key={idx} />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        <th className='p-2 text-left text-sm text-slate-400 font-normal border border-slate-700'>
                            Day
                        </th>
                        {weekHeaders}
                    </tr>
                </thead>
                <tbody>
                    {[...Array(DAYS_PER_WEEK).keys()].map((dayIndex) => (
                        <tr key={dayIndex}>
                            <td className='p-2 text-sm text-slate-400 border border-slate-700 bg-slate-800/50'>
                                {dayLabels[dayIndex]}
                            </td>
                            {weeks.map((week, weekIndex) => {
                                const date = week[dayIndex];
                                if (!date) return null;
                                const tracker = getTracker(date);
                                return (
                                    <TrackerCell
                                        key={`${weekIndex}-${dayIndex}`}
                                        date={date}
                                        tracker={tracker}
                                        onStatusClick={handleStatusClick}
                                        onNoteClick={handleNoteClick}
                                        isToday={isToday(date)}
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
    );
};
