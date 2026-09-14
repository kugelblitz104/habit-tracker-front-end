import { Button } from '@/components/ui/buttons/button';
import { fieldClass, fieldStyle } from '@/components/ui/forms/field-tiers';
import { isValidDay, parseLocalDate, relativeDayLabel, shiftDay } from '@/lib/date-utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

type DayNavigatorProps = {
    /** The day on screen, `YYYY-MM-DD`. */
    date: string;
    /** Today in the browser's zone, the furthest day forward. */
    today: string;
    onNavigate: (date: string) => void;
    /** Extra controls for the right-hand side of the row. */
    children?: ReactNode;
};

/** One format for every day, including the year: this is the stable, literal
 *  reading of the date, and a format that changes shape with the year cannot
 *  be read at a glance. */
const fullDate = (date: string): string =>
    parseLocalDate(date).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

/**
 * The journal's day header: which day is on screen, and the controls to move.
 *
 * Adjacent days are one click either side, since walking back through the week
 * is the motion this surface is used for. The date field is the escape hatch
 * for a day further off. Forward stops at today: a journal entry for a day
 * that has not happened has nothing to record and no completed tasks to show.
 *
 * The heading says how far off the day is and the subheading says which day it
 * is. The date picker on the right is the third and last place the date
 * appears, and it is an input rather than a reading of it.
 */
export const DayNavigator = ({ date, today, onNavigate, children }: DayNavigatorProps) => {
    const atToday = date === today;
    // A hand-edited `?date=` can sit in the future; forward still stops there.
    const atOrPastToday = date >= today;

    return (
        <header className='mb-[26px] flex flex-wrap items-end justify-between gap-3'>
            <div className='min-w-0'>
                <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                    {relativeDayLabel(date, today)}
                </h1>
                <p className='mt-1 font-mono text-[11px] text-text-muted'>{fullDate(date)}</p>
            </div>

            <div className='flex flex-wrap items-center justify-end gap-2'>
                <Button
                    variant='icon'
                    onClick={() => onNavigate(shiftDay(date, -1))}
                    aria-label='Previous day'
                    title='Previous day'
                >
                    <ChevronLeft size={16} />
                </Button>
                <input
                    type='date'
                    value={date}
                    max={today}
                    onChange={(event) => {
                        const next = event.target.value;
                        // An empty or half-typed value fires change events too;
                        // only a real day is worth navigating to.
                        if (isValidDay(next) && next <= today) onNavigate(next);
                    }}
                    aria-label='Jump to a day'
                    className={fieldClass('compact')}
                    style={fieldStyle('compact')}
                />
                <Button
                    variant='icon'
                    onClick={() => onNavigate(shiftDay(date, 1))}
                    disabled={atOrPastToday}
                    aria-label='Next day'
                    title={atOrPastToday ? 'Today is the latest day' : 'Next day'}
                >
                    <ChevronRight size={16} />
                </Button>
                <Button onClick={() => onNavigate(today)} disabled={atToday}>
                    Today
                </Button>
                {children}
            </div>
        </header>
    );
};
