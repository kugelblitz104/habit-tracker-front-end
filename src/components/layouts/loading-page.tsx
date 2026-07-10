export const LoadingPage = () => {
    return (
        <div
            className='flex min-h-screen items-center justify-center'
            style={{ backgroundColor: 'transparent' }}
        >
            <div className='flex flex-col items-center gap-4'>
                <div className='h-10 w-10 animate-spin rounded-full border-2 border-[var(--surface-card-border)] border-t-text-primary' />
                <p className='font-mono text-[12px] uppercase tracking-[0.16em] text-text-muted'>
                    Loading…
                </p>
            </div>
        </div>
    );
};
