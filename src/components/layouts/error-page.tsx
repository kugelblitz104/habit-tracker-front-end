import { AlertTriangle } from 'lucide-react';

type ErrorPageProps = {
    message?: string;
};

export const ErrorPage = ({ message }: ErrorPageProps) => {
    return (
        <div
            className='flex min-h-screen items-center justify-center px-6'
            style={{ backgroundColor: 'var(--bg)' }}
        >
            <div className='flex max-w-sm flex-col items-center gap-3 text-center'>
                <AlertTriangle size={28} color='var(--color-danger)' strokeWidth={2} />
                <p className='font-display text-[16px] font-semibold text-text-primary'>
                    Something went wrong
                </p>
                <p className='font-mono text-[12px] text-text-muted'>
                    {message || 'An unexpected error occurred.'}
                </p>
            </div>
        </div>
    );
};
