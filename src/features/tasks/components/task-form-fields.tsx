import { useCreateProject } from '@/features/projects/api/create-projects';
import { useProjects } from '@/features/projects/api/get-projects';
import { randomProjectColor } from '@/features/projects/utils/project-colors';
import { Check, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
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

type ProjectFieldProps = {
    /** Profile whose projects populate the dropdown (self-fetched). */
    profileId: number;
    value: number | null;
    onChange: (value: number | null) => void;
    id?: string;
};

/** Sentinel option value that swaps the select for the inline create input. */
const CREATE_PROJECT_OPTION = '__create-project__';

/**
 * Project dropdown that fetches the profile's projects itself. Archived
 * projects are hidden from the options — unless the task's CURRENT project is
 * archived, which stays visible as the selected value so the task doesn't look
 * unassigned. A trailing "＋ New project…" option swaps the select for a small
 * name input (confirm/cancel); the created project (random palette color, both
 * editable later on the project view) is selected on success.
 */
export const ProjectField = ({ profileId, value, onChange, id }: ProjectFieldProps) => {
    const generatedId = useId();
    const fieldId = id ?? `task-project-${generatedId}`;
    const projectsQuery = useProjects({ profileId, includeArchived: true });
    const createProject = useCreateProject();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const allProjects = projectsQuery.data?.projects ?? [];
    const projects = allProjects.filter((project) => !project.archived || project.id === value);

    const cancelCreate = () => {
        setIsCreating(false);
        setNewName('');
    };

    const confirmCreate = () => {
        const name = newName.trim();
        if (!name || createProject.isPending) return;
        createProject.mutate(
            { profile_id: profileId, name, color: randomProjectColor() },
            {
                onSuccess: (data) => {
                    onChange(data.id);
                    cancelCreate();
                },
                onError: () => toast.error('Failed to create project. Please try again.')
            }
        );
    };

    const handleCreateKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Swallow Enter/Escape so the host form doesn't submit and the host
        // pane/editor doesn't close.
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            confirmCreate();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancelCreate();
        }
    };

    return (
        <div>
            <label className={formLabelClass} htmlFor={isCreating ? `${fieldId}-new` : fieldId}>
                Project
            </label>
            {isCreating ? (
                <div className='flex items-center gap-1.5'>
                    <input
                        id={`${fieldId}-new`}
                        type='text'
                        autoFocus
                        value={newName}
                        disabled={createProject.isPending}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleCreateKeyDown}
                        placeholder='New project name…'
                        aria-label='New project name'
                        className={`${formFieldClass} placeholder:text-text-faint disabled:opacity-50`}
                        style={formFieldStyle}
                    />
                    <button
                        type='button'
                        onClick={confirmCreate}
                        disabled={!newName.trim() || createProject.isPending}
                        aria-label='Create project'
                        title='Create project'
                        className='shrink-0 rounded-button border p-1.5 text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <Check size={14} />
                    </button>
                    <button
                        type='button'
                        onClick={cancelCreate}
                        disabled={createProject.isPending}
                        aria-label='Cancel new project'
                        title='Cancel'
                        className='shrink-0 rounded-button border p-1.5 text-text-faint transition-colors hover:text-text-secondary disabled:opacity-50'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <select
                    id={fieldId}
                    value={value ?? ''}
                    onChange={(e) => {
                        if (e.target.value === CREATE_PROJECT_OPTION) {
                            setIsCreating(true);
                            return;
                        }
                        onChange(e.target.value === '' ? null : Number(e.target.value));
                    }}
                    className={formFieldClass}
                    style={{ ...formFieldStyle, colorScheme: 'dark' }}
                >
                    <option style={selectOptionStyle} value=''>
                        No project
                    </option>
                    {projects.map((project) => (
                        <option style={selectOptionStyle} key={project.id} value={project.id}>
                            {project.name}
                            {project.archived ? ' (archived)' : ''}
                        </option>
                    ))}
                    <option style={selectOptionStyle} value={CREATE_PROJECT_OPTION}>
                        ＋ New project…
                    </option>
                </select>
            )}
        </div>
    );
};
