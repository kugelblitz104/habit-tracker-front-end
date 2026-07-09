import type { HabitRead } from '@/api';
import { getFrequencyString } from '@/lib/date-utils';
import { useTrackerToggle } from '@/features/trackers/hooks/use-tracker-toggle';
import { DisplayStatus } from '@/types/types';
import { Check, ChevronsRight } from 'lucide-react';
import { useEffect } from 'react';

type HabitCheckboxRowProps = {
    habit: HabitRead;
    onStatusChange: (habitId: number, status: DisplayStatus) => void;
};

/**
 * One compact habit row for the Today panel: a checkbox reflecting today's
 * status, the habit name, and a right-aligned cadence tag. Clicking cycles the
 * status (not completed → completed → skipped → …) via the shared
 * `useTrackerToggle` hook.
 */
export const HabitCheckboxRow = ({ habit, onStatusChange }: HabitCheckboxRowProps) => {
    // Recomputed each render (not frozen at mount) so a session left open past
    // midnight resolves to the correct day. The date isn't part of any query key,
    // so a fresh object here is safe.
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const { status, toggle } = useTrackerToggle(habit, today);

    useEffect(() => {
        onStatusChange(habit.id, status);
    }, [habit.id, status, onStatusChange]);

    const isSkipped = status === DisplayStatus.SKIPPED;

    const box = (() => {
        switch (status) {
            case DisplayStatus.COMPLETED:
                return {
                    style: {
                        backgroundColor: 'var(--habit-complete)',
                        borderColor: 'var(--habit-complete)'
                    },
                    icon: <Check size={12} style={{ color: 'var(--bg)' }} strokeWidth={3} />
                };
            case DisplayStatus.AUTO_SKIPPED:
                return {
                    style: {
                        backgroundColor: 'var(--habit-auto-fill)',
                        borderColor: 'var(--habit-auto-border)'
                    },
                    icon: (
                        <Check size={12} style={{ color: 'var(--habit-complete)' }} strokeWidth={2} />
                    )
                };
            case DisplayStatus.SKIPPED:
                return {
                    style: {
                        backgroundColor: 'transparent',
                        borderColor: 'var(--habit-skipped)'
                    },
                    icon: (
                        <ChevronsRight
                            size={12}
                            style={{ color: 'var(--habit-skipped)' }}
                            strokeWidth={2}
                        />
                    )
                };
            case DisplayStatus.NOT_COMPLETED:
            default:
                return {
                    style: {
                        backgroundColor: 'transparent',
                        borderColor: 'var(--habit-incomplete-border)'
                    },
                    icon: null
                };
        }
    })();

    return (
        <button
            type='button'
            onClick={toggle}
            className='flex w-full items-center gap-2.5 py-1 text-left outline-none focus-visible:opacity-80'
        >
            <span
                className='flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border'
                style={box.style}
            >
                {box.icon}
            </span>
            <span
                className={`min-w-0 flex-1 truncate font-display text-[13px] ${
                    isSkipped ? 'line-through' : ''
                }`}
                style={{ color: habit.color }}
            >
                {habit.name}
            </span>
            <span className='shrink-0 font-mono text-[10px] text-text-faint'>
                {getFrequencyString(habit.frequency, habit.range)}
            </span>
        </button>
    );
};
