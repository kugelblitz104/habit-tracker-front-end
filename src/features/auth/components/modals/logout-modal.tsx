import { BaseModal } from '@/components/ui/modals/base-modal';
import { Button, CloseButton } from '@headlessui/react';

type LogoutModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleLogout?: () => void;
};

export const LogoutModal = ({ isOpen, onClose, handleLogout }: LogoutModalProps) => {
    const onSubmit = () => {
        if (handleLogout) {
            handleLogout();
        }
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title='Log out'>
            <p className='font-mono text-[12px] leading-relaxed text-text-muted'>
                Are you sure that you want to log out?
            </p>
            <div className='mt-4 flex justify-end gap-2'>
                <CloseButton
                    type='button'
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary'
                    onClick={onClose}
                >
                    Cancel
                </CloseButton>
                <Button
                    type='submit'
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-90'
                    style={{
                        backgroundColor: 'var(--color-danger-solid)',
                        color: 'var(--button-primary-text)'
                    }}
                    onClick={onSubmit}
                >
                    Log Out
                </Button>
            </div>
        </BaseModal>
    );
};
