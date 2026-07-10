import type { UserUpdate } from '@/api';
import { UpdateUserForm } from '@/features/auth/components/update-user-form';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { updateUser } from '@/features/users/api/update-users';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

/**
 * ACCOUNT card: the restyled UpdateUserForm. Saving intentionally keeps the
 * long-standing behavior of logging out and returning to /login (credentials
 * such as username/email may have changed).
 */
export const AccountCard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleUserUpdate = (updatedUser: UserUpdate) => {
        updateUser(user!.id, updatedUser)
            .then(() => {
                logout();
                navigate('/login');
            })
            .catch((error) => {
                toast.error(`Failed to update user: ${apiErrorMessage(error)}`);
            });
    };

    if (!user) return null;

    return (
        <SettingsCard label='Account' labelGapClass='mb-4'>
            <UpdateUserForm user={user} handleUpdateUser={handleUserUpdate} />
            <p className='mt-3 font-mono text-[11px] text-text-faint'>
                Saving signs you out so you can log back in with the updated details.
            </p>
        </SettingsCard>
    );
};
