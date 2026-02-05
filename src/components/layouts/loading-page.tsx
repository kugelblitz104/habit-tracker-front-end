import { PageShell } from '../ui/page-shell';

export const LoadingScreen = () => {
    return (
        <PageShell title='Loading...'>
            <div className='flex items-center justify-center min-h-screen'>
                <div className='text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto'></div>
                    <p className='mt-4 text-gray-600'>Loading...</p>
                </div>
            </div>
        </PageShell>
    );
};
