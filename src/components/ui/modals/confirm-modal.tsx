import { Button, CloseButton } from '@headlessui/react';
import type { ReactNode } from 'react';
import { BaseModal } from './base-modal';

type ConfirmModalProps = {
    isOpen: boolean;
    onClose: () => void;
    /** Runs on confirm; the modal closes afterward. */
    onConfirm: () => void;
    title: string;
    /** Body copy (string or custom nodes). */
    children: ReactNode;
    /** Confirm button label. */
    confirmLabel?: string;
    cancelLabel?: string;
    /** Danger styling for destructive confirms (red solid button). */
    danger?: boolean;
    /** Rendered above the body, as a sibling — e.g. an entity chip box naming
     * what's about to be deleted. */
    preface?: ReactNode;
    /** Extra classes on the body wrapper, e.g. `space-y-3` for multi-paragraph
     * copy. Prepended to the base body classes. */
    bodyClassName?: string;
};

const cancelClass =
    'min-h-[28px] rounded-button px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors pointer-coarse:min-h-[44px] hover:text-text-secondary';

const confirmClass =
    'min-h-[28px] rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-opacity pointer-coarse:min-h-[44px] hover:opacity-90';

/**
 * Confirm dialog on top of BaseModal: a body plus a Cancel / confirm button
 * pair. `danger` paints the confirm button with the solid danger color for
 * destructive actions (delete / log out).
 */
export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    preface,
    bodyClassName
}: ConfirmModalProps) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={title}>
            {preface}
            <div
                className={`${
                    bodyClassName ? `${bodyClassName} ` : ''
                }font-mono text-[12px] leading-relaxed text-text-muted`}
            >
                {children}
            </div>
            <div className='mt-4 flex justify-end gap-2'>
                <CloseButton type='button' className={cancelClass} onClick={onClose}>
                    {cancelLabel}
                </CloseButton>
                <Button
                    type='button'
                    onClick={handleConfirm}
                    className={confirmClass}
                    style={
                        danger
                            ? {
                                  backgroundColor: 'var(--color-danger-solid)',
                                  color: 'var(--button-primary-text)'
                              }
                            : {
                                  background: 'var(--button-primary-gradient)',
                                  color: 'var(--button-primary-text)'
                              }
                    }
                >
                    {confirmLabel}
                </Button>
            </div>
        </BaseModal>
    );
};
