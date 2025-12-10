import { BaseModal } from '@/components/ui/modals/base-modal';
import { Button, CloseButton } from '@headlessui/react';

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
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title='Are you sure that you want to log out?'
        >
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
        </BaseModal>
    );
};
