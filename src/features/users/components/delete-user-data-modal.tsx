import { ConfirmModal } from '@/components/ui/modals/confirm-modal';

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
    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleDelete}
            title={`Delete ${entityName}`}
            confirmLabel='Delete'
            danger
        >
            Are you sure you want to delete your{' '}
            <strong className='font-semibold text-text-secondary'>{entityName}</strong>?{' '}
            {entityWarning} This action{' '}
            <strong className='font-semibold text-danger'>cannot be undone.</strong>
        </ConfirmModal>
    );
};
