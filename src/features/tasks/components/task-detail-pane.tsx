import type { TaskRead } from '@/api';
import { X } from 'lucide-react';
import { TaskEditor } from './task-editor';

type TaskDetailPaneProps = {
    /** The selected task, or null when nothing is being edited. */
    task: TaskRead | null;
    /** Wide layout (lg/xl) is the only layout this pane renders in. */
    isWide: boolean;
    onClose: () => void;
};

const PaneHeader = ({ onClose }: { onClose: () => void }) => (
    <div className='mb-1 flex items-center justify-between'>
        <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
            Edit task
        </h2>
        <button
            type='button'
            onClick={onClose}
            aria-label='Close editor'
            className='rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary'
        >
            <X size={16} />
        </button>
    </div>
);

/**
 * Master-detail host for the task editor on WIDE screens (lg/xl): a sticky
 * right-side pane so the list stays fully visible. Narrow screens don't use this
 * pane at all — they navigate to the full-page `/tasks/:taskId` edit screen
 * instead (mirroring habit detail). Callers already gate rendering with
 * `showPane = isWide && selectedTask`, so `isWide` is accepted for a stable
 * signature but the component simply early-returns when there's no task.
 *
 * `TaskEditor` is reused verbatim and keyed by task id, so selecting a different
 * task fully re-seeds the editor's fields.
 */
export const TaskDetailPane = ({ task, onClose }: TaskDetailPaneProps) => {
    if (!task) return null;

    return (
        <aside className='sticky top-7 max-h-[calc(100vh-3.5rem)] w-[360px] shrink-0 overflow-y-auto'>
            <div
                className='rounded-card border p-4'
                style={{
                    backgroundColor: 'var(--surface-card-bg)',
                    borderColor: 'var(--surface-card-border)'
                }}
            >
                <PaneHeader onClose={onClose} />
                <TaskEditor key={task.id} task={task} onClose={onClose} />
            </div>
        </aside>
    );
};
