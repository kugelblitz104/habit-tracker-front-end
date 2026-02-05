import { PageShell } from '../ui/page-shell';

export const SettingsPage = () => {
    return (
        <PageShell title='Settings'>
            <div className='p-4'>
                <h1 className='text-2xl font-bold mb-4'>Settings</h1>
                <p className='text-gray-600'>Manage your account settings and preferences here.</p>
            </div>
        </PageShell>
    );
};
