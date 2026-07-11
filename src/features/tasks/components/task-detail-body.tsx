import { useProjects } from '@/features/projects/api/get-projects';
import { TaskTimeLog } from '@/features/time-entries/components/task-time-log';
import { useAuth } from '@/lib/auth-context';
import { sanitizeMultilineText } from '@/lib/input-sanitization';
import { TaskStatus } from '@/types/types';
import { Ban, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useTask } from '../api/get-tasks';
import { useDeleteTaskWithConfirm } from '../hooks/use-delete-task-with-confirm';
import { TaskDetailHeader } from './task-detail-header';
import { TaskDetailSubtasks } from './task-detail-subtasks';
import { TaskEditor } from './task-editor';

type TaskDetailBodyProps = {
    taskId: number;
    /** Close the whole surface (pane X / route back), and after delete. */
    onClose?: () => void;
    /** Report edit-mode changes up so a host can drop card chrome, etc. */
    onEditingChange?: (editing: boolean) => void;
    /** Open straight into the edit form (e.g. the context menu's "Edit…"). */
    defaultEditing?: boolean;
};

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

    const { deleteWithConfirm, isPending: isDeletePending } = useDeleteTaskWithConfirm();

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
    const notes = sanitizeMultilineText(task.notes ?? '');

    const handleDelete = () => deleteWithConfirm(task.id, { onSuccess: onClose });

    return (
        <div className='flex flex-col gap-4'>
            {/* Header + meta grouped tightly (matches habit detail spacing). */}
            <TaskDetailHeader
                task={task}
                project={project}
                pathname={pathname}
                showEstimatedEffort={showEstimatedEffort}
                onEdit={() => setIsEditing(true)}
                onClose={onClose}
            />

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
            {task.parent_id == null && (
                <TaskDetailSubtasks profileId={task.profile_id} parentId={task.id} />
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
                    disabled={isDeletePending}
                    className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50'
                    style={{ borderColor: 'var(--danger-border)', color: 'var(--color-danger)' }}
                >
                    <Trash2 size={13} />
                    {isDeletePending ? 'Deleting…' : 'Delete task'}
                </button>
            </div>
        </div>
    );
};
