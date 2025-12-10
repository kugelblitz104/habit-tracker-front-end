import {
    Button,
    CloseButton,
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle
} from '@headlessui/react';

type LogoutModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleLogout?: () => void;
};

export const LogoutModal = ({
    isOpen,
    onClose,
    handleLogout
}: LogoutModalProps) => {
    const onSubmit = () => {
        if (handleLogout) {
            handleLogout();
        }
        onClose();
    };

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
                <DialogPanel className='max-w-lg space-y-4 rounded-md bg-slate-800 p-8'>
                    <DialogTitle as='h2' className='text-2xl font-bold'>
                        Are you sure that you want to log out?
                    </DialogTitle>
                    <div className='flex space-x-2'>
                        <Button
                            type='submit'
                            className='flex-auto bg-red-500 rounded-md px-2 py-1'
                            onClick={onSubmit}
                        >
                            Log Out
                        </Button>
                        <CloseButton className='flex-auto bg-sky-500 rounded-md px-2 py-1'>
                            Cancel
                        </CloseButton>
                    </div>
                </DialogPanel>
            </div>{' '}
        </Dialog>
    );
};
