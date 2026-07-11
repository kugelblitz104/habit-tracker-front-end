import { ConfirmModal } from '@/components/ui/modals/confirm-modal';

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
    };

    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onSubmit}
            title='Log out'
            confirmLabel='Log Out'
            danger
        >
            Are you sure that you want to log out?
        </ConfirmModal>
    );
};
