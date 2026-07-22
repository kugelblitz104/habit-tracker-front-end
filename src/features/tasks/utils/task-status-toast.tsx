import { toast, type ToastContentProps } from 'react-toastify';

/**
 * Toast shown when a task is closed (completed or cancelled) from a list. When
 * `onUndo` is supplied the toast carries an explicit Undo button that reverts
 * the task to its previous status; otherwise it's a plain confirmation. Gives a
 * few-second window before it auto-dismisses.
 */
export const toastTaskClosed = (kind: 'done' | 'cancelled', onUndo?: () => void): void => {
    const label = kind === 'done' ? 'Task completed' : 'Task cancelled';
    if (!onUndo) {
        toast.success(label);
        return;
    }
    toast.success(({ closeToast }: ToastContentProps) => (
        <div className='flex items-center justify-between gap-3'>
            <span>{label}</span>
            <button
                type='button'
                onClick={() => {
                    onUndo();
                    closeToast();
                }}
                className='shrink-0 rounded-[6px] border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-primary transition-colors hover:bg-white/10'
                style={{ borderColor: 'rgba(255,255,255,.28)' }}
            >
                Undo
            </button>
        </div>
    ));
};
