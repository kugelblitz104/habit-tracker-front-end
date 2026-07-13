import { X } from 'lucide-react';
import { useId } from 'react';
import { PRIORITY_LEVELS } from '../utils/priority-config';
import { ParentTaskAutocomplete, type ParentTaskOption } from './parent-task-autocomplete';
import { TimePicker } from './time-picker';

/**
 * Shared field primitives for task forms. Extracted from `TaskEditor` so the
 * quick-capture expanded form (`TaskCaptureForm`) renders visually identical
 * fields; both forms import from here.
 */

export const formLabelClass =
    'mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

export const formFieldClass =
    'w-full rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent';

export const formFieldStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)'
};

/**
 * Explicit colors for native <option>s. Some platforms render the option popup
 * with the system (white) background regardless of the select's color-scheme,
 * which left our light option text invisible (white-on-white). Setting an
 * opaque dark background + light text on each option fixes it everywhere.
 */
export const selectOptionStyle: React.CSSProperties = {
    backgroundColor: '#1c1710',
    color: 'var(--color-text-primary)'
};

// Full-size, labeled priority levels (shared taxonomy — see priority-config).
// Each carries a short description of its effect, since priority feeds the
// server-computed band.
const PRIORITY_OPTIONS = PRIORITY_LEVELS;

type NotesFieldProps = {
    value: string;
    onChange: (value: string) => void;
    id?: string;
};

/** Labeled multiline notes/description textarea. */
export const NotesField = ({ value, onChange, id }: NotesFieldProps) => {
    const generatedId = useId();
    const fieldId = id ?? `task-notes-${generatedId}`;
    return (
        <div>
            <label className={formLabelClass} htmlFor={fieldId}>
                Notes
            </label>
            <textarea
                id={fieldId}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                placeholder='Add a description…'
                className={`${formFieldClass} resize-y leading-relaxed placeholder:text-text-faint`}
                style={formFieldStyle}
            />
        </div>
    );
};

type PriorityFieldProps = {
    value: number;
    onChange: (value: number) => void;
};

/** Priority radiogroup — full-size labeled options; each shows what the level does. */
export const PriorityField = ({ value, onChange }: PriorityFieldProps) => (
    <div>
        <span className={formLabelClass}>Priority</span>
        <div className='flex flex-col gap-1.5' role='radiogroup' aria-label='Priority'>
            {PRIORITY_OPTIONS.map((option) => {
                const selected = value === option.value;
                return (
                    <button
                        key={option.value}
                        type='button'
                        role='radio'
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className='flex items-start gap-2.5 rounded-button border px-2.5 py-2 text-left transition-colors'
                        style={{
                            borderColor: selected ? option.accent : 'var(--surface-input-border)',
                            backgroundColor: selected
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'var(--surface-input-bg)'
                        }}
                    >
                        <span
                            className='mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border'
                            style={{
                                borderColor: selected
                                    ? option.accent
                                    : 'var(--surface-input-border)'
                            }}
                        >
                            {selected && (
                                <span
                                    className='h-1.5 w-1.5 rounded-full'
                                    style={{ backgroundColor: option.accent }}
                                />
                            )}
                        </span>
                        <span className='min-w-0'>
                            <span
                                className='block font-display text-[13px] font-semibold'
                                style={{
                                    color: selected ? option.accent : 'var(--color-text-secondary)'
                                }}
                            >
                                {option.label}
                            </span>
                            <span className='mt-0.5 block font-mono text-[11px] leading-snug text-text-faint'>
                                {option.description}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    </div>
);

type DateTimeFieldProps = {
    /** Section label, e.g. "Due" or "Scheduled for". */
    label: string;
    date: string;
    time: string;
    onDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
    dateAriaLabel: string;
    timeAriaLabel: string;
};

/**
 * Date + optional time row with a "clear" affordance. Clearing drops both
 * values (a time without a date is meaningless), and the time input stays
 * disabled until a date is picked.
 */
export const DateTimeField = ({
    label,
    date,
    time,
    onDateChange,
    onTimeChange,
    dateAriaLabel,
    timeAriaLabel
}: DateTimeFieldProps) => {
    const clear = () => {
        onDateChange('');
        onTimeChange('');
    };

    return (
        <div>
            <span className={formLabelClass}>{label}</span>
            <div className='flex flex-wrap items-center gap-2'>
                <input
                    type='date'
                    value={date}
                    onChange={(e) => onDateChange(e.target.value)}
                    aria-label={dateAriaLabel}
                    className={formFieldClass}
                    style={{ ...formFieldStyle, colorScheme: 'dark', width: 'auto' }}
                />
                <TimePicker
                    value={time}
                    disabled={!date}
                    onChange={onTimeChange}
                    aria-label={timeAriaLabel}
                    className={`${formFieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    style={{ ...formFieldStyle, colorScheme: 'dark', width: '7rem' }}
                />
                {(date || time) && (
                    <button
                        type='button'
                        onClick={clear}
                        className='inline-flex items-center gap-0.5 font-mono text-[11px] text-text-faint hover:text-text-muted'
                    >
                        <X size={12} />
                        clear
                    </button>
                )}
            </div>
        </div>
    );
};

type EstimatedEffortFieldProps = {
    /** Estimated effort in minutes, or null when unset. */
    value: number | null;
    onChange: (value: number | null) => void;
    id?: string;
};

/**
 * Estimated level of effort in minutes (feeds est-vs-actual against tracked
 * time). Empty clears the estimate; negatives are coerced away.
 */
export const EstimatedEffortField = ({ value, onChange, id }: EstimatedEffortFieldProps) => {
    const generatedId = useId();
    const fieldId = id ?? `task-estimate-${generatedId}`;
    return (
        <div>
            <label className={formLabelClass} htmlFor={fieldId}>
                Estimated effort (min)
            </label>
            <input
                id={fieldId}
                type='number'
                min={0}
                step={5}
                inputMode='numeric'
                value={value ?? ''}
                onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                        onChange(null);
                        return;
                    }
                    const parsed = Math.max(0, Math.floor(Number(raw)));
                    onChange(Number.isNaN(parsed) ? null : parsed);
                }}
                placeholder='e.g. 30'
                className={`${formFieldClass} placeholder:text-text-faint`}
                style={{ ...formFieldStyle, width: '8rem' }}
            />
        </div>
    );
};

type ParentTaskFieldProps = {
    /** Current parent task id, or null when this is a top-level task. */
    value: number | null;
    onChange: (value: number | null) => void;
    /** Candidate parents (the profile's other top-level tasks). */
    options: ParentTaskOption[];
    id?: string;
};

/**
 * Parent-task selector — demotes a top-level task to a subtask (or detaches an
 * existing subtask via "None"). Only rendered for tasks that have no subtasks
 * of their own (subtasks nest one level deep, so a task with children can't
 * itself become a subtask). Demoting keeps the task's own metadata; it just
 * stops being surfaced in favor of the parent's while it's a subtask. The
 * picker is a type-to-filter autocomplete (see ParentTaskAutocomplete).
 */
export const ParentTaskField = ({ value, onChange, options, id }: ParentTaskFieldProps) => {
    const generatedId = useId();
    const fieldId = id ?? `task-parent-${generatedId}`;
    return (
        <div>
            <label className={formLabelClass} htmlFor={fieldId}>
                Parent task
            </label>
            <ParentTaskAutocomplete id={fieldId} value={value} onChange={onChange} options={options} />
        </div>
    );
};

// ProjectField was extracted to its own file (inline-create flow made this
// file too big); re-exported here so existing imports keep working.
export { ProjectField } from './project-field';
