import { Button } from '@/components/ui/buttons/button';
import { themedInputClass, themedInputStyle } from '@/components/ui/forms/input-styles';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import {
    MAX_OFFSETS,
    OFFSET_UNITS,
    addOffset,
    offsetLabel,
    offsetProblem,
    toMinutes,
    unitLabel,
    type OffsetProblem,
    type OffsetUnit
} from '../utils/reminder-offsets';

type OffsetChipsProps = {
    /** Offsets in minutes before the anchor. */
    value: readonly number[];
    onChange: (next: number[]) => void;
    /** Names the group and its controls for assistive tech ("Due reminders"). */
    label: string;
    disabled?: boolean;
};

const PROBLEM_TEXT: Record<OffsetProblem, string> = {
    invalid: 'Enter a whole number of 0 or more.',
    'too-long': 'At most 4 weeks.',
    duplicate: 'That reminder is already in the list.',
    full: `At most ${MAX_OFFSETS} reminders.`
};

/**
 * A list of reminder offsets as removable chips plus an amount + unit adder.
 * Values are minutes; each chip shows the largest unit that divides evenly.
 */
export const OffsetChips = ({ value, onChange, label, disabled = false }: OffsetChipsProps) => {
    const [amount, setAmount] = useState('');
    const [unit, setUnit] = useState<OffsetUnit>('minutes');
    const [problem, setProblem] = useState<OffsetProblem | null>(null);
    const full = value.length >= MAX_OFFSETS;
    const shownProblem = problem ?? (full ? 'full' : null);

    const add = () => {
        const minutes = toMinutes(amount === '' ? Number.NaN : Number(amount), unit);
        const found = offsetProblem(value, minutes);
        setProblem(found);
        if (found) return;
        onChange(addOffset(value, minutes));
        setAmount('');
    };

    return (
        <div role='group' aria-label={label} className='flex flex-col gap-2'>
            {value.length > 0 && (
                <ul className='flex flex-wrap gap-1.5'>
                    {value.map((minutes) => (
                        <li
                            key={minutes}
                            className='inline-flex items-center gap-1 rounded-chip border py-0.5 pl-2.5 pr-0.5 font-mono text-[12px] text-text-secondary'
                            style={themedInputStyle}
                        >
                            {offsetLabel(minutes)}
                            <Button
                                variant='subtle'
                                size='sm'
                                className='!px-1'
                                disabled={disabled}
                                aria-label={`Remove ${label} ${offsetLabel(minutes)}`}
                                onClick={() => {
                                    setProblem(null);
                                    onChange(value.filter((m) => m !== minutes));
                                }}
                            >
                                <X size={12} />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            {!full && (
                <div className='flex flex-wrap items-center gap-2'>
                    <input
                        type='number'
                        inputMode='numeric'
                        min={0}
                        step={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            add();
                        }}
                        placeholder='15'
                        aria-label={`${label} amount`}
                        aria-invalid={problem != null}
                        disabled={disabled}
                        className={themedInputClass}
                        style={{ ...themedInputStyle, width: 80 }}
                    />
                    <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as OffsetUnit)}
                        aria-label={`${label} unit`}
                        disabled={disabled}
                        className={themedInputClass}
                        style={{ ...themedInputStyle, width: 110 }}
                    >
                        {OFFSET_UNITS.map((u) => (
                            <option key={u} value={u}>
                                {unitLabel(u, 2)}
                            </option>
                        ))}
                    </select>
                    <Button onClick={add} disabled={disabled} aria-label={`Add ${label}`}>
                        <Plus size={14} />
                        Add
                    </Button>
                </div>
            )}
            {shownProblem && (
                <p role='alert' className='text-[11.5px] text-text-muted'>
                    {PROBLEM_TEXT[shownProblem]}
                </p>
            )}
        </div>
    );
};
