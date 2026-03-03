import type { UserUpdate } from '@/api';
import { UpdateUserForm } from '@/features/auth/components/update-user-form';
import { updateUser } from '@/features/users/api/update-users';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router';
import { PageShell } from '../ui/page-shell';

export const SettingsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleUserUpdate = (updatedUser: UserUpdate) => {
        updateUser(user!.id, updatedUser)
            .then((response) => {
                logout();
                navigate('/login');
            })
            .catch((error) => {
                console.error('Failed to update user:', error);
            });
    };

    return (
        <PageShell title='Settings'>
            <div className='m-4'>
                <UpdateUserForm user={user!} handleUpdateUser={handleUserUpdate} />
            </div>
        </PageShell>
    );
};
