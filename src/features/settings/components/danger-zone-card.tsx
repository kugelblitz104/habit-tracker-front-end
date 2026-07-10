import {
    deleteUser,
    deleteUserHabits,
    deleteUserTrackers
} from '@/features/users/api/delete-users';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { DeleteUserDataModal } from '@/features/users/components/delete-user-data-modal';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

type DeleteAction = {
    handler: () => void;
    entityName: string;
    entityWarning: string;
};

const outlineDangerButtonClass =
    'rounded-[9px] border px-[15px] py-[9px] text-[13px] transition-colors hover:brightness-110';

/**
 * DANGER ZONE card: delete all trackers / all habits / the whole account, each
 * routed through the existing DeleteUserDataModal confirmation flow.
 */
export const DangerZoneCard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState<DeleteAction | null>(null);

    const handleDeleteAccount = () => {
        deleteUser(user!.id)
            .then(() => {
                logout();
                navigate('/login');
            })
            .catch((error) => {
                toast.error(`Failed to delete account: ${apiErrorMessage(error)}`);
            });
    };

    const handleDeleteTrackers = () => {
        deleteUserTrackers(user!.id)
            .then(() => {
                toast.success('All trackers deleted successfully');
            })
            .catch((error) => {
                toast.error(`Failed to delete trackers: ${apiErrorMessage(error)}`);
            });
    };

    const handleDeleteHabits = () => {
        deleteUserHabits(user!.id)
            .then(() => {
                toast.success('All habits deleted successfully');
            })
            .catch((error) => {
                toast.error(`Failed to delete habits: ${apiErrorMessage(error)}`);
            });
    };

    const openDeleteModal = (action: DeleteAction) => {
        setDeleteAction(action);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteAction(null);
    };

    return (
        <SettingsCard
            label='Danger zone'
            labelColor='#d1889a'
            labelGapClass='mb-3.5'
            style={{
                backgroundColor: 'rgba(209,90,110,.05)',
                borderColor: 'rgba(209,90,110,.3)'
            }}
        >
            <div className='flex flex-wrap gap-2.5'>
                <button
                    type='button'
                    onClick={() =>
                        openDeleteModal({
                            handler: handleDeleteTrackers,
                            entityName: 'all trackers',
                            entityWarning:
                                'This will permanently delete all your tracking data.'
                        })
                    }
                    className={outlineDangerButtonClass}
                    style={{ color: '#e3b3bd', borderColor: 'var(--danger-border)' }}
                >
                    Delete all trackers
                </button>
                <button
                    type='button'
                    onClick={() =>
                        openDeleteModal({
                            handler: handleDeleteHabits,
                            entityName: 'all habits',
                            entityWarning:
                                'This will permanently delete all your habits and their trackers.'
                        })
                    }
                    className={outlineDangerButtonClass}
                    style={{ color: '#e3b3bd', borderColor: 'var(--danger-border)' }}
                >
                    Delete all habits
                </button>
                <button
                    type='button'
                    onClick={() =>
                        openDeleteModal({
                            handler: handleDeleteAccount,
                            entityName: 'account',
                            entityWarning:
                                'This will permanently delete your account and all associated data.'
                        })
                    }
                    className='rounded-[9px] px-[15px] py-[9px] text-[13px] font-semibold transition-opacity hover:opacity-90'
                    style={{
                        backgroundColor: 'var(--color-danger-solid)',
                        color: 'var(--button-primary-text)'
                    }}
                >
                    Delete account
                </button>
            </div>

            {deleteAction && (
                <DeleteUserDataModal
                    isOpen={isDeleteModalOpen}
                    onClose={closeDeleteModal}
                    handleDelete={deleteAction.handler}
                    entityName={deleteAction.entityName}
                    entityWarning={deleteAction.entityWarning}
                />
            )}
        </SettingsCard>
    );
};
