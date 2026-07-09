import { useEffect, useId, useRef, useState } from 'react';

type TimePickerProps = {
    /** Canonical HH:MM value, or '' when unset. */
    value: string;
    /** Emits a canonical HH:MM string, or '' when cleared. */
    onChange: (value: string) => void;
    disabled?: boolean;
    'aria-label'?: string;
    className?: string;
    style?: React.CSSProperties;
    id?: string;
};

// 48 half-hour marks (00:00, 00:30, … 23:30) offered as a datalist. These are
// only suggestions — the input still accepts any freely-typed time.
const HALF_HOUR_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${String(hours).padStart(2, '0')}:${minutes}`;
});

/**
 * Coerce loose user input into a canonical HH:MM string, or null when it can't
 * be parsed. Accepts "14:07", "1407", "930", "9", and HH:MM:SS (seconds are
 * dropped), so free typing works alongside the 30-minute suggestions.
 */
const normalizeTime = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2}):?(\d{2})(?::\d{2})?$/) ?? trimmed.match(/^(\d{1,2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = match[2] !== undefined ? Number(match[2]) : 0;
    if (hours > 23 || minutes > 59) return null;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Shared time control for the task editor's due + scheduled times. A text input
 * bound to a `<datalist>` of 30-minute options: the dropdown makes common times
 * one click away, but the field accepts any exact time the user types (e.g.
 * 14:07). Displays and emits 24-hour HH:MM to keep parsing unambiguous.
 */
export const TimePicker = ({
    value,
    onChange,
    disabled = false,
    'aria-label': ariaLabel,
    className,
    style,
    id
}: TimePickerProps) => {
    const generatedId = useId();
    const listId = `time-options-${id ?? generatedId}`;
    // Local text is the source of truth for what's shown while typing, so the
    // parent can't clobber an in-progress entry (e.g. "14:07" mid-keystroke).
    const [text, setText] = useState(() => normalizeTime(value) ?? value);
    // Remembers the last canonical value this component emitted, so the sync
    // effect below can tell an external `value` change (Clear button, task
    // switch) apart from the echo of our own emit.
    const lastEmitted = useRef(value);

    const emit = (next: string) => {
        lastEmitted.current = next;
        onChange(next);
    };

    // Sync FROM the parent only on external changes. When the incoming `value`
    // matches what we last emitted it's just our own change echoing back, so we
    // leave `text` alone; otherwise (e.g. the Clear button resetting to '') we
    // adopt the new value.
    useEffect(() => {
        if (value === lastEmitted.current) return;
        lastEmitted.current = value;
        setText(normalizeTime(value) ?? value);
    }, [value]);

    const handleChange = (raw: string) => {
        setText(raw);
        if (raw.trim() === '') {
            emit('');
            return;
        }
        // Emit as soon as the text is a valid time; stay quiet while mid-typing.
        const normalized = normalizeTime(raw);
        if (normalized) emit(normalized);
    };

    const handleBlur = () => {
        if (text.trim() === '') {
            emit('');
            return;
        }
        const normalized = normalizeTime(text);
        if (normalized) {
            setText(normalized);
            emit(normalized);
        } else {
            // Discard unparseable input, restoring the last good value.
            setText(normalizeTime(value) ?? value);
        }
    };

    return (
        <>
            <input
                id={id}
                type='text'
                inputMode='numeric'
                list={listId}
                value={text}
                disabled={disabled}
                placeholder='hh:mm'
                aria-label={ariaLabel}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                className={className}
                style={style}
            />
            <datalist id={listId}>
                {HALF_HOUR_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                ))}
            </datalist>
        </>
    );
};
