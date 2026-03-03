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
            <p>
                Are you sure you want to delete your {entityName}? {entityWarning} This action{' '}
                <strong>cannot be undone.</strong>
            </p>
            <div className='mt-4 flex justify-end'>
                <CloseButton type='button' className='rounded-md px-2 py-1' onClick={onClose}>
                    Cancel
                </CloseButton>
                <Button
                    type='button'
                    onClick={handleSubmit}
                    className='bg-red-500 text-white px-2 py-1 rounded-md'
                >
                    Delete
                </Button>
            </div>
        </BaseModal>
    );
};
