import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

type BaseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
};

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
};

export const BaseModal = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'lg'
}: BaseModalProps) => {
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
                <DialogPanel
                    className={`${maxWidthClasses[maxWidth]} space-y-4 rounded-lg bg-slate-800 p-8`}
                >
                    <DialogTitle as='h2' className='text-2xl font-bold'>
                        {title}
                    </DialogTitle>
                    {children}
                </DialogPanel>
            </div>
        </Dialog>
    );
};
