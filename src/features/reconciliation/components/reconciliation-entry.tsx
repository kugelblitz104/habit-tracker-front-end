import { Button } from '@/components/ui/buttons/button';
import { selectOptionStyle } from '@/components/ui/forms/form-field-styles';
import { Select } from '@/components/ui/forms/select';

import type { ReconciliationWindows } from '../utils/queues';

type WindowKey = keyof ReconciliationWindows;

type Choice = { value: number; label: string };

const CHOICES: Record<WindowKey, Choice[]> = {
    staleTaskDays: [
        { value: 30, label: '30 days' },
        { value: 60, label: '60 days' },
        { value: 90, label: '90 days' },
        { value: 180, label: '180 days' }
    ],
    staleProjectDays: [
        { value: 90, label: '3 months' },
        { value: 180, label: '6 months' },
        { value: 365, label: '12 months' }
    ],
    staleHabitDays: [
        { value: 30, label: '30 days' },
        { value: 56, label: '8 weeks' },
        { value: 90, label: '90 days' }
    ]
};

// Each label names what it applies to: three selects sit in a row, so "Stale
// after" alone does not say stale what.
const WINDOW_LABEL: Record<WindowKey, string> = {
    staleTaskDays: 'Tasks stale after',
    staleProjectDays: 'Projects quiet after',
    staleHabitDays: 'Habits judged over'
};

export type QueueSummary = {
    key: string;
    count: number;
    label: string;
    detail: string;
};

type ReconciliationEntryProps = {
    queues: QueueSummary[];
    windows: ReconciliationWindows;
    onChangeWindow: (key: WindowKey, days: number) => void;
    /** Whole days since the last run, or null if this profile never has. */
    daysSince: number | null;
    total: number;
    isLoading: boolean;
    onBegin: () => void;
};

const lastRunLabel = (daysSince: number | null): string => {
    if (daysSince === null) return 'Never reconciled';
    if (daysSince === 0) return 'Reconciled today';
    if (daysSince === 1) return 'Reconciled yesterday';
    return `Reconciled ${daysSince} days ago`;
};

/**
 * The entry screen: what there is to decide, the windows that decide it, and
 * the way in.
 *
 * The three window controls live here rather than in Settings because the
 * counts above them recompute as you change them - you can see what a
 * threshold costs before committing to it, which a Settings page cannot show.
 */
export const ReconciliationEntry = ({
    queues,
    windows,
    onChangeWindow,
    daysSince,
    total,
    isLoading,
    onBegin
}: ReconciliationEntryProps) => (
    <div className='flex flex-col gap-6'>
        <div className='flex flex-wrap items-baseline justify-between gap-2'>
            <h1 className='font-display text-[20px] text-text-primary'>The reconciliation</h1>
            <span className='font-mono text-[11px] text-text-faint'>{lastRunLabel(daysSince)}</span>
        </div>

        <p className='max-w-prose font-display text-[13.5px] text-text-muted'>
            Decisions, not insights. Clear a queue and the list gets smaller. Everything below is
            measured from dates the server stamps for you, so nothing here depends on your having
            remembered to log something.
        </p>

        <ul className='flex flex-col gap-2'>
            {queues.map((queue) => (
                <li key={queue.key} className='flex items-baseline gap-3'>
                    <span className='w-8 shrink-0 text-right font-mono text-[15px] text-text-primary'>
                        {queue.count}
                    </span>
                    <span className='font-display text-[13.5px] text-text-muted'>
                        {queue.label}
                    </span>
                    <span className='font-mono text-[10.5px] text-text-faint'>{queue.detail}</span>
                </li>
            ))}
        </ul>

        <div className='flex flex-wrap gap-4'>
            {(Object.keys(CHOICES) as WindowKey[]).map((key) => (
                <label key={key} className='flex flex-col gap-1'>
                    <span className='font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-faint'>
                        {WINDOW_LABEL[key]}
                    </span>
                    <Select
                        value={windows[key]}
                        onChange={(event) => onChangeWindow(key, Number(event.target.value))}
                    >
                        {CHOICES[key].map((choice) => (
                            <option
                                key={choice.value}
                                value={choice.value}
                                style={selectOptionStyle}
                            >
                                {choice.label}
                            </option>
                        ))}
                    </Select>
                </label>
            ))}
        </div>

        <div>
            <Button size='lg' variant='primary' onClick={onBegin} disabled={isLoading}>
                {isLoading ? 'Counting…' : total === 0 ? 'Nothing to decide' : 'Begin'}
            </Button>
        </div>
    </div>
);
