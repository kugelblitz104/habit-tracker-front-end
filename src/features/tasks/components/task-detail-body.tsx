import { useProjects } from '@/features/projects/api/get-projects';
import { TaskTimeLog } from '@/features/time-entries/components/task-time-log';
import { useAuth } from '@/lib/auth-context';
import { parseLocalDate } from '@/lib/date-utils';
import { sanitizeMultilineText } from '@/lib/input-sanitization';
import { TaskStatus } from '@/types/types';
import { Ban, Check, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'react-toastify';
import { useDeleteTask } from '../api/delete-tasks';
import { useTask, useTasks } from '../api/get-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { formatShortDate } from '../utils/task-format';
import { PriorityMeter } from './priority-meter';
import { STATUS_META } from './status-config';
import { TaskEditor } from './task-editor';
import type { TaskBand } from '@/types/types';

type TaskDetailBodyProps = {
    taskId: number;
    /** Close the whole surface (pane X / route back), and after delete. */
    onClose?: () => void;
    /** Report edit-mode changes up so a host can drop card chrome, etc. */
    onEditingChange?: (editing: boolean) => void;
    /** Open straight into the edit form (e.g. the context menu's "Edit…"). */
    defaultEditing?: boolean;
};

const PRIORITY_LABELS = ['None', 'Low', 'Medium', 'High'];
// Only now/soon get a colored band chip; whenever is implied (no chip), and
// closed tasks show their status instead.
const BAND_CHIP: Record<string, { label: string; color: string }> = {
    now: { label: 'Needs attention', color: 'var(--color-now-accent)' },
    soon: { label: 'Soon', color: 'var(--color-soon-label)' }
};

const MetaChip = ({ children }: { children: React.ReactNode }) => (
    <span
        className='inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 font-mono text-[11px] text-text-secondary'
        style={{ borderColor: 'var(--surface-input-border)' }}
    >
        {children}
    </span>
);

/**
 * Read-only task detail with an inline edit mode, mirroring the habit detail
 * pattern. The view shows all task info plus an editable time log; the Edit
 * pencil flips to the plain TaskEditor (which has no time log). Reused by the
 * Today side pane and the full-page task route.
 */
export const TaskDetailBody = ({
    taskId,
    onClose,
    onEditingChange,
    defaultEditing = false
}: TaskDetailBodyProps) => {
    const { activeProfile } = useAuth();
    const showEstimatedEffort = activeProfile?.show_estimated_effort ?? false;
    const { pathname } = useLocation();

    const taskQuery = useTask({ taskId });
    const task = taskQuery.data ?? null;

    const [isEditing, setIsEditing] = useState(defaultEditing);
    useEffect(() => onEditingChange?.(isEditing), [isEditing, onEditingChange]);

    const projectsQuery = useProjects({ profileId: task?.profile_id, includeArchived: true });
    const project = useMemo(
        () =>
            task?.project_id != null
                ? projectsQuery.data?.projects?.find((p) => p.id === task.project_id) ?? null
                : null,
        [task?.project_id, projectsQuery.data]
    );

    const subtasksQuery = useTasks({
        profileId: task?.profile_id,
        includeClosed: true
    });
    const subtasks = useMemo(
        () =>
            (subtasksQuery.data?.tasks ?? [])
                .filter((t) => t.parent_id === taskId)
                // Completed subtasks sink to the bottom; creation order within a group.
                .sort((a, b) => {
                    const aDone = a.status === TaskStatus.DONE ? 1 : 0;
                    const bDone = b.status === TaskStatus.DONE ? 1 : 0;
                    if (aDone !== bDone) return aDone - bDone;
                    return a.created_date.localeCompare(b.created_date);
                }),
        [subtasksQuery.data, taskId]
    );

    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    if (!task) {
        return (
            <div className='p-4 font-mono text-[12px] text-text-faint'>
                {taskQuery.isError ? 'Failed to load task.' : 'Loading…'}
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className='flex flex-col gap-3'>
                <div className='flex items-center justify-between gap-3'>
                    <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                        Edit task
                    </h2>
                    <button
                        type='button'
                        onClick={() => setIsEditing(false)}
                        aria-label='Back to task'
                        title='Back to task'
                        className='shrink-0 rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary'
                    >
                        <X size={16} />
                    </button>
                </div>
                <TaskEditor
                    key={task.id}
                    task={task}
                    onClose={() => setIsEditing(false)}
                    onDeleted={onClose}
                />
            </div>
        );
    }

    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const meta = STATUS_META[status];
    const notes = sanitizeMultilineText(task.notes ?? '');
    const priority = task.priority ?? 0;
    const bandChip = task.band ? BAND_CHIP[task.band] : undefined;
    const meterBand: Exclude<TaskBand, 'hidden'> =
        task.band === 'now' || task.band === 'soon' ? task.band : 'whenever';

    const toggleSubtask = (subtaskId: number, done: boolean) => {
        updateTask.mutate({
            taskId: subtaskId,
            data: { status: done ? TaskStatus.DONE : TaskStatus.OPEN }
        });
    };

    const handleDelete = () => {
        if (deleteTask.isPending) return;
        if (!window.confirm('Delete this task? This cannot be undone.')) return;
        deleteTask.mutate(task.id, {
            onSuccess: () => {
                toast.success('Task deleted');
                onClose?.();
            },
            onError: () => toast.error('Failed to delete task. Please try again.')
        });
    };

    return (
        <div className='flex flex-col gap-4'>
            {/* Header + meta grouped tightly (matches habit detail spacing). */}
            <div className='flex flex-col gap-1.5'>
                {/* Title + edit/close controls */}
                <div className='flex items-start justify-between gap-3'>
                    <h1 className='min-w-0 flex-1 font-display text-[19px] font-bold leading-snug text-text-primary'>
                        {task.title}
                    </h1>
                    <div className='flex shrink-0 items-center gap-1.5'>
                        <button
                            type='button'
                            onClick={() => setIsEditing(true)}
                            aria-label='Edit task'
                            title='Edit task'
                            className='rounded-button border p-1.5 text-text-muted transition-colors hover:text-text-primary'
                            style={{ borderColor: 'var(--surface-input-border)' }}
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            type='button'
                            onClick={onClose}
                            aria-label='Close'
                            className='rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary'
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Due / scheduled / project — a quieter subheader below status. */}
                {(task.due_date || task.scheduled_date || project) && (
                    <div className='flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-text-faint'>
                        {project && (
                            <Link
                                to={`/projects/${project.id}`}
                                state={{ from: pathname }}
                                className='font-semibold transition-opacity hover:opacity-80'
                                style={{ color: project.color }}
                            >
                                {project.name}
                            </Link>
                        )}
                        {task.due_date && (
                            <span>Due {formatShortDate(parseLocalDate(task.due_date))}</span>
                        )}
                        {task.scheduled_date && (
                            <span>
                                Scheduled {formatShortDate(parseLocalDate(task.scheduled_date))}
                            </span>
                        )}
                    </div>
                )}

                {/* Status · band · priority — right under the title. */}
                <div className='flex flex-wrap items-center gap-2'>
                    <MetaChip>
                        <span
                            className='h-1.5 w-1.5 rounded-full'
                            style={{ backgroundColor: meta.color }}
                        />
                        <span style={{ color: meta.color }}>{meta.label}</span>
                    </MetaChip>
                    {bandChip && (
                        <span
                            className='inline-flex items-center rounded-chip border px-2 py-0.5 font-mono text-[11px] font-semibold'
                            style={{ color: bandChip.color, borderColor: bandChip.color }}
                        >
                            {bandChip.label}
                        </span>
                    )}
                    {priority > 0 && (
                        <span
                            className='inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 font-mono text-[11px] text-text-secondary'
                            style={{ borderColor: 'var(--surface-input-border)' }}
                        >
                            <PriorityMeter priority={priority} band={meterBand} />
                            {PRIORITY_LABELS[priority]}
                        </span>
                    )}
                    {showEstimatedEffort && task.estimated_effort != null && (
                        <MetaChip>Est. {task.estimated_effort}m</MetaChip>
                    )}
                </div>
            </div>

            {/* Block reason — only while the task is actually blocked, in a
                hard-to-miss red banner. */}
            {status === TaskStatus.BLOCKED && task.block_reason && (
                <div
                    className='flex items-start gap-2 rounded-button border px-3 py-2'
                    style={{
                        borderColor: 'var(--danger-border)',
                        backgroundColor: 'var(--danger-bg, rgba(193,78,106,0.12))',
                        color: 'var(--color-danger)'
                    }}
                >
                    <Ban size={14} className='mt-0.5 shrink-0' />
                    <span className='font-mono text-[12px] leading-snug'>
                        Blocked: {task.block_reason}
                    </span>
                </div>
            )}

            {/* Notes */}
            {notes && (
                <div>
                    <h3 className='mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'>
                        Notes
                    </h3>
                    <p className='whitespace-pre-wrap font-display text-[13.5px] leading-relaxed text-text-secondary'>
                        {notes}
                    </p>
                </div>
            )}

            {/* Subtasks (complete toggles; add/remove happens in edit) */}
            {task.parent_id == null && subtasks.length > 0 && (
                <div>
                    <h3 className='mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint'>
                        Subtasks · {subtasks.filter((s) => s.status === TaskStatus.DONE).length}/
                        {subtasks.length}
                    </h3>
                    <div className='flex flex-col gap-1'>
                        {subtasks.map((subtask) => {
                            const done = subtask.status === TaskStatus.DONE;
                            return (
                                <button
                                    key={subtask.id}
                                    type='button'
                                    onClick={() => toggleSubtask(subtask.id, !done)}
                                    className='flex items-center gap-2 rounded-button px-1.5 py-1 text-left transition-colors hover:bg-white/5'
                                >
                                    <span
                                        className='flex h-4 w-4 shrink-0 items-center justify-center rounded border'
                                        style={{
                                            borderColor: done
                                                ? 'var(--color-status-done-check)'
                                                : 'var(--surface-input-border)',
                                            backgroundColor: done
                                                ? 'rgba(63, 107, 74, 0.35)'
                                                : 'transparent'
                                        }}
                                    >
                                        {done && (
                                            <Check
                                                size={11}
                                                strokeWidth={3}
                                                style={{ color: 'var(--color-status-done-check)' }}
                                            />
                                        )}
                                    </span>
                                    <span
                                        className={`font-display text-[13px] ${
                                            done
                                                ? 'text-text-faint line-through'
                                                : 'text-text-secondary'
                                        }`}
                                    >
                                        {subtask.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Editable time log */}
            <TaskTimeLog profileId={task.profile_id} taskId={task.id} />

            {/* Footer: delete */}
            <div
                className='flex justify-start border-t pt-4'
                style={{ borderColor: 'rgba(255,255,255,.06)' }}
            >
                <button
                    type='button'
                    onClick={handleDelete}
                    disabled={deleteTask.isPending}
                    className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50'
                    style={{ borderColor: 'var(--danger-border)', color: 'var(--color-danger)' }}
                >
                    <Trash2 size={13} />
                    {deleteTask.isPending ? 'Deleting…' : 'Delete task'}
                </button>
            </div>
        </div>
    );
};
