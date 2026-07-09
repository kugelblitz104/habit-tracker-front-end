import type { TaskRead, TaskUpdate } from '@/api';
import { useProjects } from '@/features/projects/api/get-projects';
import { sanitizeMultilineText } from '@/lib/input-sanitization';
import { TaskStatus } from '@/types/types';
import { Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteTask } from '../api/delete-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { TimePicker } from './time-picker';

type TaskEditorProps = {
    task: TaskRead;
    /** Close the panel (Cancel, or after a successful save). */
    onClose: () => void;
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

const labelClass =
    'mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

const fieldClass =
    'w-full rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent';

const fieldStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)'
};

/**
 * Inline detail panel opened by tapping a task title. Edits title, notes,
 * priority, due date/time, scheduled date/time, project and (when blocked) block
 * reason, then saves
 * via a partial PATCH that only sends changed fields. Bands are server-computed,
 * so a priority/due change may relocate the task once the list refetches.
 */
export const TaskEditor = ({ task, onClose }: TaskEditorProps) => {
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();
    const projectsQuery = useProjects({ profileId: task.profile_id });
    const projects = projectsQuery.data?.projects ?? [];

    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const isBlocked = status === TaskStatus.BLOCKED;
    const isScheduled = status === TaskStatus.SCHEDULED;

    const [title, setTitle] = useState(task.title);
    const [notes, setNotes] = useState(task.notes ?? '');
    const [priority, setPriority] = useState(task.priority ?? 0);
    const [dueDate, setDueDate] = useState(task.due_date ?? '');
    const [dueTime, setDueTime] = useState(task.due_time ?? '');
    const [scheduledDate, setScheduledDate] = useState(task.scheduled_date ?? '');
    const [scheduledTime, setScheduledTime] = useState(task.scheduled_time ?? '');
    const [projectId, setProjectId] = useState<number | null>(task.project_id ?? null);
    const [blockReason, setBlockReason] = useState(task.block_reason ?? '');

    // Clearing a date also drops its time (a time without a date is meaningless).
    const clearDue = () => {
        setDueDate('');
        setDueTime('');
    };

    const clearScheduled = () => {
        setScheduledDate('');
        setScheduledTime('');
    };

    // Scheduled date/time only apply while the task is Scheduled. Whenever the
    // selected status is anything else, drop the local values so the field starts
    // clean if the task returns to Scheduled and no stale scheduled values are sent
    // on save. (The backend also nulls these for non-scheduled tasks.)
    useEffect(() => {
        if (!isScheduled) {
            setScheduledDate('');
            setScheduledTime('');
        }
    }, [isScheduled]);

    // Assemble a partial PATCH containing only fields that actually changed.
    const buildPatch = (): TaskUpdate | null => {
        const patch: TaskUpdate = {};

        const trimmedTitle = title.trim();
        if (trimmedTitle && trimmedTitle !== task.title) patch.title = trimmedTitle;

        const cleanNotes = sanitizeMultilineText(notes);
        const currentNotes = sanitizeMultilineText(task.notes ?? '');
        if (cleanNotes !== currentNotes) patch.notes = cleanNotes.length ? cleanNotes : null;

        if (priority !== (task.priority ?? 0)) patch.priority = priority;

        if (dueDate !== (task.due_date ?? '')) patch.due_date = dueDate || null;
        if (dueTime !== (task.due_time ?? '')) patch.due_time = dueTime || null;

        if (scheduledDate !== (task.scheduled_date ?? ''))
            patch.scheduled_date = scheduledDate || null;
        if (scheduledTime !== (task.scheduled_time ?? ''))
            patch.scheduled_time = scheduledTime || null;

        if (projectId !== (task.project_id ?? null)) patch.project_id = projectId;

        if (isBlocked) {
            const trimmedReason = blockReason.trim();
            if (trimmedReason !== (task.block_reason ?? ''))
                patch.block_reason = trimmedReason || null;
        }

        return Object.keys(patch).length > 0 ? patch : null;
    };

    const canSave = title.trim().length > 0 && !updateTask.isPending;

    const handleSave = () => {
        if (!canSave) return;
        const patch = buildPatch();
        if (!patch) {
            onClose();
            return;
        }
        updateTask.mutate(
            { taskId: task.id, data: patch },
            {
                onSuccess: () => onClose(),
                // Keep the panel open with the user's edits intact on failure.
                onError: () => toast.error('Failed to save changes. Please try again.')
            }
        );
    };

    // Hard-delete: confirm first (deletion is irreversible), then remove the task.
    // The delete mutation invalidates the ['tasks'] / project caches, so the task
    // drops out of every band once the confirmation resolves.
    const handleDelete = () => {
        if (deleteTask.isPending) return;
        if (!window.confirm('Delete this task? This cannot be undone.')) return;
        deleteTask.mutate(task.id, {
            onSuccess: () => {
                toast.success('Task deleted');
                onClose();
            },
            onError: () => toast.error('Failed to delete task. Please try again.')
        });
    };

    return (
        <div className='mt-3 flex flex-col gap-3 rounded-button border p-3' style={fieldStyle}>
            {/* Title */}
            <div>
                <label className={labelClass} htmlFor={`task-title-${task.id}`}>
                    Title
                </label>
                <input
                    id={`task-title-${task.id}`}
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`${fieldClass} font-display text-[13px] text-text-primary`}
                    style={fieldStyle}
                />
            </div>

            {/* Notes / description */}
            <div>
                <label className={labelClass} htmlFor={`task-notes-${task.id}`}>
                    Notes
                </label>
                <textarea
                    id={`task-notes-${task.id}`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder='Add a description…'
                    className={`${fieldClass} resize-y leading-relaxed placeholder:text-text-faint`}
                    style={fieldStyle}
                />
            </div>

            {/* Priority — full-size labeled options; each shows what the level does. */}
            <div>
                <span className={labelClass}>Priority</span>
                <div className='flex flex-col gap-1.5' role='radiogroup' aria-label='Priority'>
                    {PRIORITY_OPTIONS.map((option) => {
                        const selected = priority === option.value;
                        return (
                            <button
                                key={option.value}
                                type='button'
                                role='radio'
                                aria-checked={selected}
                                onClick={() => setPriority(option.value)}
                                className='flex items-start gap-2.5 rounded-button border px-2.5 py-2 text-left transition-colors'
                                style={{
                                    borderColor: selected
                                        ? option.accent
                                        : 'var(--surface-input-border)',
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
                                            color: selected
                                                ? option.accent
                                                : 'var(--color-text-secondary)'
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

            {/* Due date (+ optional time) */}
            <div>
                <span className={labelClass}>Due</span>
                <div className='flex flex-wrap items-center gap-2'>
                    <input
                        type='date'
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        aria-label='Due date'
                        className={fieldClass}
                        style={{ ...fieldStyle, colorScheme: 'dark', width: 'auto' }}
                    />
                    <TimePicker
                        value={dueTime}
                        disabled={!dueDate}
                        onChange={setDueTime}
                        aria-label='Due time'
                        className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
                        style={{ ...fieldStyle, colorScheme: 'dark', width: '7rem' }}
                    />
                    {(dueDate || dueTime) && (
                        <button
                            type='button'
                            onClick={clearDue}
                            className='inline-flex items-center gap-0.5 font-mono text-[11px] text-text-faint hover:text-text-muted'
                        >
                            <X size={12} />
                            clear
                        </button>
                    )}
                </div>
            </div>

            {/* Scheduled date (+ optional time) — only editable while the task is
                Scheduled; the date drives banding and is surfaced on the card's
                scheduled pill. */}
            {isScheduled && (
                <div>
                    <span className={labelClass}>Scheduled for</span>
                    <div className='flex flex-wrap items-center gap-2'>
                        <input
                            type='date'
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            aria-label='Scheduled date'
                            className={fieldClass}
                            style={{ ...fieldStyle, colorScheme: 'dark', width: 'auto' }}
                        />
                        <TimePicker
                            value={scheduledTime}
                            disabled={!scheduledDate}
                            onChange={setScheduledTime}
                            aria-label='Scheduled time'
                            className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
                            style={{ ...fieldStyle, colorScheme: 'dark', width: '7rem' }}
                        />
                        {(scheduledDate || scheduledTime) && (
                            <button
                                type='button'
                                onClick={clearScheduled}
                                className='inline-flex items-center gap-0.5 font-mono text-[11px] text-text-faint hover:text-text-muted'
                            >
                                <X size={12} />
                                clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Project */}
            <div>
                <label className={labelClass} htmlFor={`task-project-${task.id}`}>
                    Project
                </label>
                <select
                    id={`task-project-${task.id}`}
                    value={projectId ?? ''}
                    disabled={projects.length === 0}
                    onChange={(e) =>
                        setProjectId(e.target.value === '' ? null : Number(e.target.value))
                    }
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    style={{ ...fieldStyle, colorScheme: 'dark' }}
                >
                    <option value=''>
                        {projects.length === 0 ? 'No projects yet' : 'No project'}
                    </option>
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Block reason — only when the task is blocked. */}
            {isBlocked && (
                <div>
                    <label className={labelClass} htmlFor={`task-block-${task.id}`}>
                        Block reason
                    </label>
                    <input
                        id={`task-block-${task.id}`}
                        type='text'
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder='What is this blocked on?'
                        className={`${fieldClass} placeholder:text-text-faint`}
                        style={fieldStyle}
                    />
                </div>
            )}

            {/* Footer: destructive Delete on the left (mirrors the habit detail
                footer), Cancel / Save on the right. */}
            <div className='mt-1 flex items-center justify-between gap-2'>
                <button
                    type='button'
                    onClick={handleDelete}
                    disabled={deleteTask.isPending}
                    className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50'
                    style={{
                        borderColor: 'var(--danger-border)',
                        color: 'var(--color-danger)'
                    }}
                >
                    <Trash2 size={13} />
                    {deleteTask.isPending ? 'Deleting…' : 'Delete task'}
                </button>
                <div className='flex items-center gap-2'>
                    <button
                        type='button'
                        onClick={onClose}
                        className='rounded-button px-3 py-1.5 font-display text-[12px] text-text-muted transition-colors hover:text-text-secondary'
                    >
                        Cancel
                    </button>
                    <button
                        type='button'
                        onClick={handleSave}
                        disabled={!canSave}
                        className='rounded-button px-3 py-1.5 font-display text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                        style={{
                            background: 'var(--button-primary-gradient)',
                            color: 'var(--button-primary-text)'
                        }}
                    >
                        {updateTask.isPending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
