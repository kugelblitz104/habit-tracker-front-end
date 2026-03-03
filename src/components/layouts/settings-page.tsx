import type { UserUpdate } from '@/api';
import { UpdateUserForm } from '@/features/auth/components/update-user-form';
import {
    deleteUser,
    deleteUserHabits,
    deleteUserTrackers
} from '@/features/users/api/delete-users';
import { updateUser } from '@/features/users/api/update-users';
import { useAuth } from '@/lib/auth-context';
import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ActionButton, ButtonVariant } from '../ui/buttons/action-button';
import { Card } from '../ui/card';
import { PageShell } from '../ui/page-shell';
import { DeleteUserDataModal } from '@/features/users/components/delete-user-data-modal';
import { toast } from 'react-toastify';

type DeleteAction = {
    handler: () => void;
    entityName: string;
    entityWarning: string;
};

export const SettingsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState<DeleteAction | null>(null);

    const handleUserUpdate = (updatedUser: UserUpdate) => {
        updateUser(user!.id, updatedUser)
            .then((response) => {
                logout();
                navigate('/login');
            })
            .catch((error) => {
                toast.error('Failed to update user:', error);
            });
    };

    const handleDeleteAccount = (userId: number) => {
        deleteUser(userId)
            .then(() => {
                logout();
                navigate('/login');
            })
            .catch((error) => {
                toast.error('Failed to delete account:', error);
            });
    };

    const handleDeleteTrackers = () => {
        deleteUserTrackers(user!.id)
            .then(() => {
                toast.success('All trackers deleted successfully');
            })
            .catch((error) => {
                toast.error('Failed to delete trackers:', error);
            });
    };

    const handleDeleteHabits = () => {
        deleteUserHabits(user!.id)
            .then(() => {
                toast.success('All habits deleted successfully');
            })
            .catch((error) => {
                toast.error('Failed to delete habits:', error);
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
        <PageShell title='Settings'>
            <div className='m-4 gap-4 flex flex-col'>
                <UpdateUserForm user={user!} handleUpdateUser={handleUserUpdate} />
                <Card title='Manage Data'>
                    <span className='flex gap-2'>
                        <ActionButton
                            label='Import Data'
                            icon={<Upload />}
                            variant={ButtonVariant.Secondary}
                        />
                        <ActionButton
                            label='Export Data'
                            icon={<Download />}
                            variant={ButtonVariant.Secondary}
                        />
                    </span>
                </Card>
                <Card title='Danger Zone' className='border-red-500'>
                    <span className='flex flex-wrap gap-2'>
                        <ActionButton
                            label='Delete All Trackers'
                            variant={ButtonVariant.Secondary}
                            onClick={() =>
                                openDeleteModal({
                                    handler: handleDeleteTrackers,
                                    entityName: 'all trackers',
                                    entityWarning:
                                        'This will permanently delete all your tracking data.'
                                })
                            }
                        />
                        <ActionButton
                            label='Delete All Habits'
                            variant={ButtonVariant.Secondary}
                            onClick={() =>
                                openDeleteModal({
                                    handler: handleDeleteHabits,
                                    entityName: 'all habits',
                                    entityWarning:
                                        'This will permanently delete all your habits and their trackers.'
                                })
                            }
                        />
                        <ActionButton
                            label='Delete Account'
                            variant={ButtonVariant.Danger}
                            onClick={() =>
                                openDeleteModal({
                                    handler: () => handleDeleteAccount(user!.id),
                                    entityName: 'account',
                                    entityWarning:
                                        'This will permanently delete your account and all associated data.'
                                })
                            }
                        />
                    </span>
                </Card>
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
        </PageShell>
    );
};
