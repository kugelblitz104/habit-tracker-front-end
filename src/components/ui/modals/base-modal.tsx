import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

type BaseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
};

export const BaseModal = ({ isOpen, onClose, title, children }: BaseModalProps) => {
    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            transition
            className='
                relative z-50
                transition-opacity
                duration-500
                ease-out
                data-closed:opacity-0
            '
        >
            <DialogBackdrop className='fixed inset-0 bg-black/50' />
            <div className='fixed inset-0 flex items-center justify-center p-4'>
                <DialogPanel className={`space-y-4 rounded-lg bg-slate-800 p-6 overflow-y-auto`}>
                    <DialogTitle as='h2' className='text-2xl font-bold'>
                        {title}
                    </DialogTitle>
                    {children}
                </DialogPanel>
            </div>
        </Dialog>
    );
};
