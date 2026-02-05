import { useAuth } from '@/lib/auth-context';
import { PageShell } from '../ui/page-shell';
import { UpdateUserForm } from '@/features/auth/components/update-user-form';

export const SettingsPage = () => {
    const { user } = useAuth();

    return (
        <PageShell title='Settings'>
            <div className='m-4'>
                <UpdateUserForm user={user!} />
            </div>
        </PageShell>
    );
};
