import type { TaskRead, TaskUpdate } from '@/api';
import { sanitizeMultilineText } from '@/lib/input-sanitization';
import { TaskStatus } from '@/types/types';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteTask } from '../api/delete-tasks';
import { useUpdateTask } from '../api/update-tasks';
import {
    DateTimeField,
    formFieldClass,
    formFieldStyle,
    formLabelClass,
    NotesField,
    PriorityField,
    ProjectField
} from './task-form-fields';

type TaskEditorProps = {
    task: TaskRead;
    /** Close the panel (Cancel, or after a successful save). */
    onClose: () => void;
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
        <div className='mt-3 flex flex-col gap-3 rounded-button border p-3' style={formFieldStyle}>
            {/* Title */}
            <div>
                <label className={formLabelClass} htmlFor={`task-title-${task.id}`}>
                    Title
                </label>
                <input
                    id={`task-title-${task.id}`}
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`${formFieldClass} font-display text-[13px] text-text-primary`}
                    style={formFieldStyle}
                />
            </div>

            {/* Notes / description */}
            <NotesField id={`task-notes-${task.id}`} value={notes} onChange={setNotes} />

            {/* Priority — full-size labeled options; each shows what the level does. */}
            <PriorityField value={priority} onChange={setPriority} />

            {/* Due date (+ optional time) */}
            <DateTimeField
                label='Due'
                date={dueDate}
                time={dueTime}
                onDateChange={setDueDate}
                onTimeChange={setDueTime}
                dateAriaLabel='Due date'
                timeAriaLabel='Due time'
            />

            {/* Scheduled date (+ optional time) — only editable while the task is
                Scheduled; the date drives banding and is surfaced on the card's
                scheduled pill. */}
            {isScheduled && (
                <DateTimeField
                    label='Scheduled for'
                    date={scheduledDate}
                    time={scheduledTime}
                    onDateChange={setScheduledDate}
                    onTimeChange={setScheduledTime}
                    dateAriaLabel='Scheduled date'
                    timeAriaLabel='Scheduled time'
                />
            )}

            {/* Project */}
            <ProjectField
                id={`task-project-${task.id}`}
                profileId={task.profile_id}
                value={projectId}
                onChange={setProjectId}
            />

            {/* Block reason — only when the task is blocked. */}
            {isBlocked && (
                <div>
                    <label className={formLabelClass} htmlFor={`task-block-${task.id}`}>
                        Block reason
                    </label>
                    <input
                        id={`task-block-${task.id}`}
                        type='text'
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder='What is this blocked on?'
                        className={`${formFieldClass} placeholder:text-text-faint`}
                        style={formFieldStyle}
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
