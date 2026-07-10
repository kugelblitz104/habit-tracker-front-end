import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

type BaseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
};

/**
 * Ember-themed dialog shell shared by the confirm/form modals. Mirrors the
 * inline shells in sort-habit-modal / note-dialog: dark backdrop, panel on
 * `--bg` with the card border, and a mono uppercase micro-title.
 */
export const BaseModal = ({ isOpen, onClose, title, children }: BaseModalProps) => {
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
                    className='max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-card border p-5 shadow-popover'
                    style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    <DialogTitle className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-habit-label'>
                        {title}
                    </DialogTitle>
                    {children}
                </DialogPanel>
            </div>
        </Dialog>
    );
};
