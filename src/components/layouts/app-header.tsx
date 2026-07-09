import { ProfileSwitcher } from '@/features/profiles/components/profile-switcher';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { Link, useLocation } from 'react-router';

type NavTab = {
    label: string;
    to: string;
    /** Show the "current hub" dot (Today is the hub). */
    dot?: boolean;
};

const TABS: NavTab[] = [
    { label: 'Today', to: '/', dot: true },
    { label: 'Habits', to: '/habits' },
    { label: 'Projects', to: '/projects' }
];

/**
 * Which nav tab is active for a given pathname. Drill-in detail pages resolve
 * to their parent tab (habit detail -> Habits, project detail -> Projects) so
 * the nav stays oriented; unrelated routes (e.g. /settings) light up nothing.
 */
function activeTabKey(pathname: string): string | null {
    if (pathname === '/') return '/';
    if (pathname.startsWith('/habits') || pathname.startsWith('/details')) return '/habits';
    if (pathname.startsWith('/projects')) return '/projects';
    return null;
}

/**
 * Persistent top navigation shared by Today / Habits / Projects (and their
 * detail pages). Tabs on the left, the profile switcher on the right, with a
 * thin bottom hairline. `maxWidthClass` should match the page's content width
 * so the nav aligns with the column below it.
 */
export function AppHeader({ maxWidthClass = PAGE_MAX_WIDTH }: { maxWidthClass?: string }) {
    const { pathname } = useLocation();
    const activeKey = activeTabKey(pathname);

    return (
        <header
            className='border-b'
            style={{ borderColor: 'var(--surface-card-border)' }}
        >
            <div
                className={`mx-auto flex items-stretch justify-between gap-3 px-5 md:px-7 ${maxWidthClass}`}
            >
                <nav className='flex items-stretch gap-0.5 sm:gap-1.5'>
                    {TABS.map((tab) => {
                        const active = tab.to === activeKey;
                        return (
                            <Link
                                key={tab.to}
                                to={tab.to}
                                aria-current={active ? 'page' : undefined}
                                className={`-mb-px flex items-center gap-1.5 border-b-2 px-2 py-3.5 font-display text-[14px] transition-colors sm:px-2.5 ${
                                    active
                                        ? 'text-text-primary'
                                        : 'border-transparent text-text-muted hover:text-text-secondary'
                                }`}
                                style={active ? { borderColor: 'var(--color-now-accent)' } : undefined}
                            >
                                {tab.dot && (
                                    <span
                                        className='h-1.5 w-1.5 shrink-0 rounded-full'
                                        style={{
                                            backgroundColor: active
                                                ? 'var(--color-now-accent)'
                                                : 'var(--color-text-faint)'
                                        }}
                                    />
                                )}
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className='flex items-center'>
                    <ProfileSwitcher />
                </div>
            </div>
        </header>
    );
}
