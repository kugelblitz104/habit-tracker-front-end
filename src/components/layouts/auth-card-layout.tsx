import type { ReactNode } from 'react';

type AuthCardLayoutProps = {
    /** Mono uppercase micro-subtitle under the "Habit Tracker" title. */
    subtitle: string;
    children: ReactNode;
};

/**
 * Shared shell for the login/registration pages: centered column, "Habit
 * Tracker" title + mono subtitle, and the ember card surface. Each page keeps
 * its own form/fields/logic and renders them as `children`.
 */
export const AuthCardLayout = ({ subtitle, children }: AuthCardLayoutProps) => (
    <div
        className='flex min-h-screen flex-col items-center justify-center px-4 py-10'
        style={{ backgroundColor: 'transparent' }}
    >
        <div className='w-full max-w-[400px]'>
            <header className='mb-6 text-center'>
                <h1 className='font-display text-[24px] font-bold text-text-primary'>
                    Habit Tracker
                </h1>
                <p className='mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted'>
                    {subtitle}
                </p>
            </header>
            <div
                className='rounded-card border p-5 md:p-6'
                style={{
                    backgroundColor: 'var(--surface-card-bg)',
                    borderColor: 'var(--surface-card-border)'
                }}
            >
                {children}
            </div>
        </div>
    </div>
);
