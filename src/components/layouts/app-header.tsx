import { MENU_ITEM_CLASS, ThemedMenuItems } from '@/components/ui/menu';
import { ProfileSwitcher } from '@/features/profiles/components/profile-switcher';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { Menu, MenuButton, MenuItem } from '@headlessui/react';
import { Check, Menu as MenuIcon } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router';

// DEV-ONLY debug menu. `import.meta.env.DEV` compiles to `false` in prod, the
// dynamic import becomes unreachable dead code, and Rollup drops the module —
// so the debug tooling never ships. Lazy (vs static import) guarantees the
// exclusion regardless of side-effect analysis.
const DebugMenu = import.meta.env.DEV
    ? React.lazy(() =>
          import('@/features/dev/components/debug-menu').then((m) => ({
              default: m.DebugMenu
          }))
      )
    : null;

type NavTab = {
    label: string;
    to: string;
    /** The Today "hub" tab renders as a filled pill instead of an underline tab. */
    hub?: boolean;
};

const TABS: NavTab[] = [
    { label: 'Today', to: '/', hub: true },
    { label: 'Tasks', to: '/tasks' },
    { label: 'Habits', to: '/habits' },
    { label: 'Projects', to: '/projects' },
    { label: 'Timer', to: '/timer' }
];

/**
 * Which nav tab is active for a given pathname. Drill-in detail pages resolve
 * to their parent tab (habit detail -> Habits, project detail -> Projects) so
 * the nav stays oriented; unrelated routes (e.g. /settings) light up nothing.
 */
function activeTabKey(pathname: string): string | null {
    if (pathname === '/') return '/';
    // Full-page task detail (/tasks/:id) and the All-tasks list both light Tasks.
    if (pathname === '/tasks' || pathname.startsWith('/tasks/')) return '/tasks';
    if (pathname.startsWith('/habits') || pathname.startsWith('/details')) return '/habits';
    if (pathname.startsWith('/projects')) return '/projects';
    if (pathname.startsWith('/timer')) return '/timer';
    return null;
}

/**
 * Persistent top navigation shared by Today / Habits / Projects / Timer (and
 * their detail pages). On small screens the tabs collapse into a hamburger
 * dropdown so the bar never crowds; the profile switcher stays on the right.
 * `maxWidthClass` should match the page's content width so the nav aligns with
 * the column below it.
 */
export function AppHeader({ maxWidthClass = PAGE_MAX_WIDTH }: { maxWidthClass?: string }) {
    const { pathname } = useLocation();
    const { activeProfile } = useAuth();
    const activeKey = activeTabKey(pathname);
    // When a profile has habits disabled the feature is hidden wholesale — the
    // Habits tab disappears as if it were never added (the /habits route itself
    // redirects to Today).
    const tabs =
        activeProfile?.habits_enabled === false ? TABS.filter((tab) => tab.to !== '/habits') : TABS;
    const activeTab = tabs.find((tab) => tab.to === activeKey) ?? null;

    return (
        <header className='border-b' style={{ borderColor: 'var(--surface-card-border)' }}>
            <div
                className={`mx-auto flex items-stretch justify-between gap-3 px-5 md:px-7 ${maxWidthClass}`}
            >
                {/* Inline tabs (md and up) */}
                <nav className='hidden items-center gap-1 sm:gap-1.5 md:flex'>
                    {tabs.map((tab) => {
                        const active = tab.to === activeKey;
                        // The Today "hub" tab is a filled pill (orange gradient when
                        // active, grey when not); the rest are underline tabs.
                        if (tab.hub) {
                            return (
                                <Link
                                    key={tab.to}
                                    to={tab.to}
                                    aria-current={active ? 'page' : undefined}
                                    className='my-2 rounded-chip px-3.5 py-1.5 font-display text-[13.5px] font-semibold transition-opacity hover:opacity-90'
                                    style={
                                        active
                                            ? {
                                                  background: 'var(--button-primary-gradient)',
                                                  color: 'var(--button-primary-text)'
                                              }
                                            : {
                                                  backgroundColor: 'rgba(255,255,255,.06)',
                                                  color: 'var(--color-text-muted)'
                                              }
                                    }
                                >
                                    {tab.label}
                                </Link>
                            );
                        }
                        return (
                            <Link
                                key={tab.to}
                                to={tab.to}
                                aria-current={active ? 'page' : undefined}
                                className={`-mb-px flex items-center gap-1.5 self-stretch border-b-2 px-2 py-3.5 font-display text-[14px] transition-colors sm:px-2.5 ${
                                    active
                                        ? 'text-text-primary'
                                        : 'border-transparent text-text-muted hover:text-text-secondary'
                                }`}
                                style={
                                    active ? { borderColor: 'var(--color-now-accent)' } : undefined
                                }
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Hamburger dropdown (below md) */}
                <Menu as='div' className='relative flex items-center md:hidden'>
                    <MenuButton
                        aria-label='Navigation menu'
                        className='inline-flex items-center gap-1.5 py-3.5 font-display text-[14px] text-text-primary outline-none'
                    >
                        <MenuIcon size={18} className='text-text-secondary' />
                        {activeTab?.label ?? 'Menu'}
                    </MenuButton>
                    <ThemedMenuItems anchor={{ to: 'bottom start', gap: 4 }} className='w-44'>
                        {tabs.map((tab) => {
                            const active = tab.to === activeKey;
                            return (
                                <MenuItem key={tab.to}>
                                    <Link to={tab.to} className={MENU_ITEM_CLASS}>
                                        {tab.label}
                                        {active && (
                                            <Check
                                                size={14}
                                                className='ml-auto shrink-0 text-now-accent'
                                                strokeWidth={3}
                                            />
                                        )}
                                    </Link>
                                </MenuItem>
                            );
                        })}
                    </ThemedMenuItems>
                </Menu>

                <div className='flex items-center gap-2'>
                    {import.meta.env.DEV && DebugMenu && (
                        <React.Suspense fallback={null}>
                            <DebugMenu />
                        </React.Suspense>
                    )}
                    <ProfileSwitcher />
                </div>
            </div>
        </header>
    );
}
