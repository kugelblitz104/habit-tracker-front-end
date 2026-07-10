import { BaseModal } from '@/components/ui/modals/base-modal';
import { Button, CloseButton } from '@headlessui/react';

type DeleteUserDataModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleDelete: () => void;
    entityName?: string;
    entityWarning?: string;
};

export const DeleteUserDataModal = ({
    isOpen,
    onClose,
    handleDelete,
    entityName = 'user data',
    entityWarning = 'This action cannot be undone.'
}: DeleteUserDataModalProps) => {
    const handleSubmit = () => {
        handleDelete();
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={`Delete ${entityName}`}>
            <p className='font-mono text-[12px] leading-relaxed text-text-muted'>
                Are you sure you want to delete your{' '}
                <strong className='font-semibold text-text-secondary'>{entityName}</strong>?{' '}
                {entityWarning} This action{' '}
                <strong className='font-semibold text-danger'>cannot be undone.</strong>
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
                    type='button'
                    onClick={handleSubmit}
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-90'
                    style={{
                        backgroundColor: 'var(--color-danger-solid)',
                        color: 'var(--button-primary-text)'
                    }}
                >
                    Delete
                </Button>
            </div>
        </BaseModal>
    );
};
