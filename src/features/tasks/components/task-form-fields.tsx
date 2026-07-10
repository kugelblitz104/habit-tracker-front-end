import { useProjects } from '@/features/projects/api/get-projects';
import { X } from 'lucide-react';
import { useId } from 'react';
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

type PriorityOption = {
    value: number;
    label: string;
    description: string;
    /** Accent reflecting the band this priority level tends to land in. */
    accent: string;
};

// Full-size, labeled priority levels. Each carries a short description of its
// effect, since priority feeds the server-computed band. Accents ramp from a
// faint "Whenever" grey up to the hot "Needs-you-now" meter color.
const PRIORITY_OPTIONS: PriorityOption[] = [
    {
        value: 0,
        label: 'None',
        description: 'No urgency. Stays in Whenever unless a due date pulls it up.',
        accent: 'var(--color-text-faint)'
    },
    {
        value: 1,
        label: 'Low',
        description: 'Minor. Usually Whenever.',
        accent: 'var(--color-whenever-text)'
    },
    {
        value: 2,
        label: 'Medium',
        description: 'Notable. Surfaces in Soon.',
        accent: 'var(--color-soon-meter)'
    },
    {
        value: 3,
        label: 'High',
        description: 'Urgent. Always in Needs-you-now.',
        accent: 'var(--color-now-meter)'
    }
];

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

type ProjectFieldProps = {
    /** Profile whose projects populate the dropdown (self-fetched). */
    profileId: number;
    value: number | null;
    onChange: (value: number | null) => void;
    id?: string;
};

/** Project dropdown that fetches the profile's projects itself. */
export const ProjectField = ({ profileId, value, onChange, id }: ProjectFieldProps) => {
    const generatedId = useId();
    const fieldId = id ?? `task-project-${generatedId}`;
    const projectsQuery = useProjects({ profileId });
    const projects = projectsQuery.data?.projects ?? [];

    return (
        <div>
            <label className={formLabelClass} htmlFor={fieldId}>
                Project
            </label>
            <select
                id={fieldId}
                value={value ?? ''}
                disabled={projects.length === 0}
                onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                className={`${formFieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
                style={{ ...formFieldStyle, colorScheme: 'dark' }}
            >
                <option value=''>{projects.length === 0 ? 'No projects yet' : 'No project'}</option>
                {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                        {project.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
