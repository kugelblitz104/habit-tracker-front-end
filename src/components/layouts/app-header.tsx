import { MENU_ITEM_CLASS, ThemedMenuItems } from '@/components/ui/menu';
import { ProfileSwitcher } from '@/features/profiles/components/profile-switcher';
import { SearchPalette } from '@/features/search/components/search-palette';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH, PAGE_WIDTH_TRANSITION } from '@/lib/layout';
import { anyDetailPaneOpen, closeAllDetailPanes } from '@/lib/detail-pane-registry';
import { Menu, MenuButton, MenuItem } from '@headlessui/react';
import { Check, Menu as MenuIcon, Search } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

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
    { label: 'Timer', to: '/timer' },
    { label: 'Countdown', to: '/countdown' },
    { label: 'Insights', to: '/insights' }
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
    if (pathname.startsWith('/countdown')) return '/countdown';
    if (pathname.startsWith('/habits') || pathname.startsWith('/details')) return '/habits';
    if (pathname.startsWith('/projects')) return '/projects';
    if (pathname.startsWith('/timer')) return '/timer';
    if (pathname.startsWith('/insights')) return '/insights';
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
    const [searchOpen, setSearchOpen] = useState(false);

    // Global ⌘K / Ctrl+K opens the search palette from anywhere. Only one header
    // is mounted at a time (one per page), so this registers a single listener.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
    // When a profile has habits/countdowns disabled the feature is hidden
    // wholesale — its tab disappears as if it were never added.
    const tabs = TABS.filter(
        (tab) =>
            !(tab.to === '/habits' && activeProfile?.habits_enabled === false) &&
            !(tab.to === '/countdown' && activeProfile?.countdowns_enabled === false) &&
            !(tab.to === '/insights' && activeProfile?.insights_enabled === false)
    );
    const activeTab = tabs.find((tab) => tab.to === activeKey) ?? null;
    const navigate = useNavigate();

    // Runs just before a tab navigation (React Router fires Link onClick before
    // it navigates). When no detail pane is open we let the Link do its normal
    // view-transition slide. When one IS open we sequence the two motions: cancel
    // the immediate nav, animate the pane closed (quick — see `data-vt-nav` in
    // app.css), then run the page slide. That avoids the page morphing/
    // cross-fading down from the wider pane-open layout.
    const handleNavClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
            if (typeof document === 'undefined' || !anyDetailPaneOpen()) return;
            e.preventDefault();
            const root = document.documentElement;
            root.setAttribute('data-vt-nav', '');
            closeAllDetailPanes();
            // Let the close animation play, then slide to the new page.
            window.setTimeout(() => {
                root.removeAttribute('data-vt-nav');
                navigate(to, { viewTransition: true });
            }, 180);
        },
        [navigate]
    );

    return (
        <header
            // Own view-transition name so the bar is captured as its own group
            // instead of sliding with the page during a route view transition —
            // the full-width bar is identical across pages, so it stays put while
            // only the content beneath pans.
            className='sticky top-0 z-40 border-b [view-transition-name:app-header]'
            style={{
                borderColor: 'var(--surface-card-border)',
                // Solid base so scrolled content doesn't bleed through the sticky
                // bar (the page's top glow is a fixed body gradient behind this).
                backgroundColor: 'var(--bg)'
            }}
        >
            <div
                className={`mx-auto flex items-stretch justify-between gap-3 px-5 md:px-7 ${PAGE_WIDTH_TRANSITION} ${maxWidthClass}`}
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
                                    viewTransition
                                    prefetch='render'
                                    onClick={(e) => handleNavClick(e, tab.to)}
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
                                viewTransition
                                prefetch='render'
                                onClick={(e) => handleNavClick(e, tab.to)}
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
                                    <Link
                                        to={tab.to}
                                        viewTransition
                                        prefetch='intent'
                                        onClick={(e) => handleNavClick(e, tab.to)}
                                        className={MENU_ITEM_CLASS}
                                    >
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
                    <button
                        type='button'
                        onClick={() => setSearchOpen(true)}
                        aria-label='Search'
                        title='Search (⌘K)'
                        className='rounded-full p-1.5 text-text-muted transition-colors hover:text-text-primary'
                    >
                        <Search size={18} />
                    </button>
                    {import.meta.env.DEV && DebugMenu && (
                        <React.Suspense fallback={null}>
                            <DebugMenu />
                        </React.Suspense>
                    )}
                    <ProfileSwitcher />
                </div>
            </div>
            <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        </header>
    );
}
