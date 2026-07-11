import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

type BaseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    /** Mono uppercase micro-title. Omit for a title-less panel (custom header). */
    title?: string;
    /** Override the panel width (default `max-w-md`). */
    panelClassName?: string;
    children: ReactNode;
};

/**
 * Ember-themed dialog shell shared by the confirm/form modals: dark backdrop,
 * panel on `--bg` with the card border, and an optional mono uppercase
 * micro-title. Adopted by the habit note/sort dialogs and the confirm modals so
 * the dialog chrome lives in one place.
 */
export const BaseModal = ({
    isOpen,
    onClose,
    title,
    panelClassName = 'max-w-md',
    children
}: BaseModalProps) => {
    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            transition
            className='relative z-50 transition-opacity duration-300 ease-out data-closed:opacity-0'
        >
            <DialogBackdrop className='fixed inset-0 bg-black/60' />
            <div className='fixed inset-0 flex items-center justify-center p-4'>
                <DialogPanel
                    className={`max-h-full w-full space-y-4 overflow-y-auto rounded-card border p-5 shadow-popover ${panelClassName}`}
                    style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    {title && (
                        <DialogTitle className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-habit-label'>
                            {title}
                        </DialogTitle>
                    )}
                    {children}
                </DialogPanel>
            </div>
        </Dialog>
    );
};
