import { ghostButtonBorder, ghostButtonClass } from '@/components/ui/buttons/button-styles';
import type { ReactNode } from 'react';

type InlineConfirmActionProps = {
    /** True to show the confirm/cancel pair instead of `children` (the trigger row). */
    isConfirming: boolean;
    /** Trigger content shown when not confirming (e.g. a row's edit/delete icon buttons). */
    children: ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    pending?: boolean;
    /** Mono micro-prompt shown before the buttons, e.g. "Delete?" / "Remove?". */
    confirmPrompt?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Confirm button vertical padding differs slightly between the profiles/connections rows. */
    confirmButtonClassName?: string;
    /** Wrapper classes for the trigger row; connections' icon row is tighter (gap-1) than profiles'. */
    triggerClassName?: string;
};

const baseConfirmButtonClass =
    'rounded-[8px] px-2.5 text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';

/**
 * Inline "Delete? / Confirm / Cancel" mini-toolbar shared by the profiles and
 * connections row actions: shows `children` (the row's own trigger buttons)
 * until `isConfirming` flips true, then swaps in a mono prompt plus a
 * destructive Confirm button and a ghost Cancel. The parent owns the
 * confirming state (i.e. which row, if any, is mid-delete).
 */
export const InlineConfirmAction = ({
    isConfirming,
    children,
    onConfirm,
    onCancel,
    pending = false,
    confirmPrompt = 'Delete?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmButtonClassName = 'py-1.5',
    triggerClassName = 'flex items-center gap-1.5'
}: InlineConfirmActionProps) => {
    if (!isConfirming) {
        return <span className={triggerClassName}>{children}</span>;
    }

    return (
        <span className='flex items-center gap-1.5'>
            <span className='font-mono text-[11px] text-text-muted'>{confirmPrompt}</span>
            <button
                type='button'
                onClick={onConfirm}
                disabled={pending}
                className={`${baseConfirmButtonClass} ${confirmButtonClassName}`}
                style={{
                    backgroundColor: 'var(--color-danger-solid)',
                    color: 'var(--button-primary-text)'
                }}
            >
                {confirmLabel}
            </button>
            <button
                type='button'
                onClick={onCancel}
                className={ghostButtonClass}
                style={{ borderColor: ghostButtonBorder }}
            >
                {cancelLabel}
            </button>
        </span>
    );
};
