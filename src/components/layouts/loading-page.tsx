import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { PAGE_MAX_WIDTH } from '@/lib/layout';

const THEME = {
    baseColor: 'var(--surface-card-border)',
    highlightColor: 'var(--surface-row-hover)'
};

/** Heading and row placeholders for a page body, announced as a single busy region. */
export const LoadingContent = () => (
    <SkeletonTheme {...THEME}>
        <div role='status' aria-busy='true'>
            <span className='sr-only'>Loading…</span>
            <div aria-hidden='true' className='flex flex-col gap-4'>
                <Skeleton className='h-7 rounded-full' containerClassName='block w-48' />
                {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className='h-14 rounded-card' containerClassName='block' />
                ))}
            </div>
        </div>
    </SkeletonTheme>
);

/**
 * Full-page placeholder shaped like the signed-in shell (header bar plus page
 * column). It stands in for the real `AppHeader`, which needs auth and mounts
 * hooks that must not run while signed out. Static markup, safe to server-render.
 */
export const LoadingPage = () => (
    <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
        <SkeletonTheme {...THEME}>
            <header
                aria-hidden='true'
                className='h-[var(--app-header-h)] border-b'
                style={{
                    borderColor: 'var(--surface-card-border)',
                    backgroundColor: 'var(--bg)'
                }}
            >
                <div
                    className={`mx-auto flex h-full items-center justify-between gap-3 px-5 md:px-7 ${PAGE_MAX_WIDTH}`}
                >
                    <div className='flex items-center gap-4'>
                        <Skeleton className='h-8 rounded-chip' containerClassName='block w-16' />
                        <span className='hidden items-center gap-4 md:flex'>
                            {Array.from({ length: 4 }, (_, i) => (
                                <Skeleton
                                    key={i}
                                    className='h-3.5 rounded-full'
                                    containerClassName='block w-14'
                                />
                            ))}
                        </span>
                    </div>
                    <div className='flex items-center gap-3'>
                        <Skeleton circle className='h-5 w-5' containerClassName='block w-5' />
                        <Skeleton
                            className='h-9 rounded-full'
                            containerClassName='block w-24 sm:w-36'
                        />
                    </div>
                </div>
            </header>
        </SkeletonTheme>
        <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
            <LoadingContent />
        </div>
    </div>
);
