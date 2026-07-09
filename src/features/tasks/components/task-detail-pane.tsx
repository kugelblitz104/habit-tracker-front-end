import type { TaskRead } from '@/api';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';
import { TaskEditor } from './task-editor';

type TaskDetailPaneProps = {
    /** The selected task, or null when nothing is being edited. */
    task: TaskRead | null;
    /** Wide layout (lg/xl) renders a sticky side pane; narrow uses an overlay. */
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
 * Master-detail host for the task editor. On wide screens (lg/xl) it renders a
 * sticky right-side pane so the list stays fully visible; on narrow screens it
 * opens as a right slide-over overlay (Escape / backdrop / close all dismiss).
 *
 * `TaskEditor` is reused verbatim and keyed by task id, so selecting a different
 * task fully re-seeds the editor's fields.
 */
export const TaskDetailPane = ({ task, isWide, onClose }: TaskDetailPaneProps) => {
    if (!task) return null;

    if (isWide) {
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
    }

    return (
        <Dialog open onClose={onClose} className='relative z-50'>
            <DialogBackdrop className='fixed inset-0 bg-black/50' />
            <div className='fixed inset-0 flex justify-end'>
                <DialogPanel
                    className='flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l p-5'
                    style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    <PaneHeader onClose={onClose} />
                    <TaskEditor key={task.id} task={task} onClose={onClose} />
                </DialogPanel>
            </div>
        </Dialog>
    );
};
