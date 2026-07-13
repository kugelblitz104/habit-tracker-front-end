import type { TaskRead, TaskUpdate } from '@/api';
import { useAuth } from '@/lib/auth-context';
import { sanitizeMultilineText } from '@/lib/input-sanitization';
import { TaskStatus } from '@/types/types';
import { Trash2 } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useTasks } from '../api/get-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { useDeleteTaskWithConfirm } from '../hooks/use-delete-task-with-confirm';
import { SubtaskSection } from './subtask-section';
import { useTimeEntrySummary } from '@/features/time-entries/api/get-time-entries';
import { formatHumanDuration } from '@/features/time-entries/utils/format-duration';
import {
    DateTimeField,
    EstimatedEffortField,
    formFieldClass,
    formFieldStyle,
    formLabelClass,
    NotesField,
    ParentTaskField,
    PriorityField,
    ProjectField
} from './task-form-fields';

type TaskEditorProps = {
    task: TaskRead;
    /** Leave the editor (Cancel, or after a successful save). */
    onClose: () => void;
    /** Called after a successful delete; falls back to onClose when omitted.
     *  Lets a host (e.g. the detail view) close the whole surface rather than
     *  just returning to a now-deleted task's read view. */
    onDeleted?: () => void;
};

/**
 * Inline detail panel opened by tapping a task title. Edits title, notes,
 * priority, due date/time, scheduled date/time, project and (when blocked) block
 * reason, then saves
 * via a partial PATCH that only sends changed fields. Bands are server-computed,
 * so a priority/due change may relocate the task once the list refetches.
 */
export const TaskEditor = ({ task, onClose, onDeleted }: TaskEditorProps) => {
    const { activeProfile } = useAuth();
    const showEstimatedEffort = activeProfile?.show_estimated_effort ?? false;
    const updateTask = useUpdateTask();
    const { deleteWithConfirm, isPending: isDeletePending } = useDeleteTaskWithConfirm();

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
    const [parentId, setParentId] = useState<number | null>(task.parent_id ?? null);
    const [estimatedEffort, setEstimatedEffort] = useState<number | null>(
        task.estimated_effort ?? null
    );
    const [blockReason, setBlockReason] = useState(task.block_reason ?? '');

    // Parent-task candidates for demote/re-parent: the profile's other
    // top-level tasks. A task that itself has subtasks can't become a subtask
    // (subtasks nest one level deep), so the field is hidden in that case.
    const canReparent = (task.subtask_count ?? 0) === 0;
    const tasksQuery = useTasks({
        profileId: task.profile_id,
        includeClosed: true,
        queryConfig: { enabled: canReparent }
    });
    const parentOptions = (tasksQuery.data?.tasks ?? [])
        .filter((t) => t.parent_id == null && t.id !== task.id)
        .map((t) => ({ id: t.id, title: t.title }));

    // Actual tracked time for this task (sum of completed entries), shown beside
    // the estimate for a quick est-vs-actual read.
    const summaryQuery = useTimeEntrySummary({ profileId: task.profile_id });
    const trackedSeconds =
        summaryQuery.data?.per_task?.find((row) => row.task_id === task.id)?.total_seconds ?? 0;

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

        if (parentId !== (task.parent_id ?? null)) patch.parent_id = parentId;

        if (estimatedEffort !== (task.estimated_effort ?? null))
            patch.estimated_effort = estimatedEffort;

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
    const handleDelete = () => deleteWithConfirm(task.id, { onSuccess: onDeleted ?? onClose });

    // Shift+Enter saves the task from anywhere in the editor — including the notes
    // textarea, where plain Enter inserts a newline. Plain Enter keeps its native
    // behavior everywhere; the subtask rapid-add input stops propagation on Enter
    // to add a subtask, so that key never reaches this bubble-phase handler either.
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter' || !e.shiftKey || e.defaultPrevented) return;
        e.preventDefault();
        handleSave();
    };

    return (
        <div
            className='mt-3 flex flex-col gap-3 rounded-button border p-3'
            style={formFieldStyle}
            onKeyDown={handleKeyDown}
        >
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

            {/* Subtasks — only on top-level tasks (one level deep); a subtask
                being edited never shows its own nested section. */}
            {task.parent_id == null && <SubtaskSection parent={task} />}

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

            {/* Estimated effort (+ actual tracked time for a quick comparison).
                Field visibility is a per-profile preference. */}
            {showEstimatedEffort && (
                <div>
                    <EstimatedEffortField
                        id={`task-estimate-${task.id}`}
                        value={estimatedEffort}
                        onChange={setEstimatedEffort}
                    />
                    {trackedSeconds > 0 && (
                        <p className='mt-1 font-mono text-[11px] text-text-faint'>
                            {formatHumanDuration(trackedSeconds)} tracked
                        </p>
                    )}
                </div>
            )}

            {/* Project */}
            <ProjectField
                id={`task-project-${task.id}`}
                profileId={task.profile_id}
                value={projectId}
                onChange={setProjectId}
            />

            {/* Parent task — demote to a subtask (or detach) when this task has
                no subtasks of its own. */}
            {canReparent && (
                <ParentTaskField
                    id={`task-parent-${task.id}`}
                    value={parentId}
                    onChange={setParentId}
                    options={parentOptions}
                />
            )}

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
                    disabled={isDeletePending}
                    className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50'
                    style={{
                        borderColor: 'var(--danger-border)',
                        color: 'var(--color-danger)'
                    }}
                >
                    <Trash2 size={13} />
                    {isDeletePending ? 'Deleting…' : 'Delete task'}
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
