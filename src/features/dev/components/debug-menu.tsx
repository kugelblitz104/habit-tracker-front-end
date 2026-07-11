import { ThemedMenuItems } from '@/components/ui/menu';
import { Menu, MenuButton, MenuItem } from '@headlessui/react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

/**
 * DEV-ONLY debug menu (flask icon in the AppHeader). Never rendered — or even
 * bundled — in production: the only import site (app-header.tsx) is a dynamic
 * import behind `import.meta.env.DEV`, so this whole module is dropped from
 * prod builds. Contents:
 *   - fire each react-toastify variant to eyeball toast theming
 *   - jump to hard-to-reach routes (detail pages, 404)
 *   - render LoadingPage / ErrorPage / Login / Register previews via the
 *     dev-only /dev/debug route (login/register are previews there because the
 *     real routes redirect authenticated users back to `/`)
 * Deliberately small and utilitarian; not a product surface.
 */

const TOAST_VARIANTS = [
    { label: 'success', fire: () => toast.success('Success toast (debug)') },
    { label: 'error', fire: () => toast.error('Error toast (debug)') },
    { label: 'info', fire: () => toast.info('Info toast (debug)') },
    { label: 'warning', fire: () => toast.warning('Warning toast (debug)') },
    { label: 'default', fire: () => toast('Default toast (debug)') }
] as const;

/**
 * First numeric `id` found in any cached list query under `key` — the list may
 * be the data itself or live under `listProp` ({ habits: [...] }, { tasks: [...] }).
 * Cheap way to deep-link detail routes without fetching; null when no data yet.
 */
function firstCachedId(queryClient: QueryClient, key: string, listProp: string): number | null {
    for (const [, data] of queryClient.getQueriesData({ queryKey: [key] })) {
        const list = Array.isArray(data)
            ? data
            : (data as Record<string, unknown> | undefined)?.[listProp];
        const first = Array.isArray(list) ? (list[0] as { id?: unknown } | undefined) : undefined;
        if (typeof first?.id === 'number') return first.id;
    }
    return null;
}

const ITEM_CLASS =
    'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] text-text-secondary data-focus:bg-white/5';

const LABEL_CLASS = 'px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint';

export const DebugMenu = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Resolved on open-click render; fine for a dev tool.
    const habitId = firstCachedId(queryClient, 'habits', 'habits');
    const taskId = firstCachedId(queryClient, 'tasks', 'tasks');

    const navItems: { label: string; to: string | null }[] = [
        {
            label: habitId ? `Habit detail (#${habitId})` : 'Habit detail — no cached habit',
            to: habitId ? `/details/${habitId}` : null
        },
        {
            label: taskId ? `Task detail (#${taskId})` : 'Task detail — no cached task',
            to: taskId ? `/tasks/${taskId}` : null
        },
        { label: '404 / route error page', to: '/dev/definitely-not-a-route' },
        // Login/Register render as playground previews — the REAL /login and
        // /register (correctly) redirect an authenticated user back to `/`.
        { label: 'Login page (preview)', to: '/dev/debug?view=login' },
        { label: 'Register page (preview)', to: '/dev/debug?view=register' },
        { label: 'LoadingPage', to: '/dev/debug?view=loading' },
        { label: 'ErrorPage', to: '/dev/debug?view=error' }
    ];

    return (
        <Menu as='div' className='relative'>
            <MenuButton
                title='Debug menu (dev only)'
                className='flex h-7 w-7 items-center justify-center rounded-chip border text-text-muted outline-none transition-colors hover:bg-white/5 hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-now-accent'
                style={{ borderColor: 'var(--surface-card-border)' }}
            >
                <FlaskConical size={14} />
            </MenuButton>
            <ThemedMenuItems anchor={{ to: 'bottom end', gap: 8 }} className='w-60'>
                <p className={LABEL_CLASS}>Toasts</p>
                {/* Plain buttons (not MenuItem) so the menu stays open while
                    firing several variants back to back. */}
                <div className='flex flex-wrap gap-1 px-2 pb-1.5'>
                    {TOAST_VARIANTS.map((variant) => (
                        <button
                            key={variant.label}
                            type='button'
                            onClick={variant.fire}
                            className='rounded-chip border px-2 py-0.5 font-mono text-[11px] text-text-secondary transition-colors hover:bg-white/5'
                            style={{ borderColor: 'var(--surface-card-border)' }}
                        >
                            {variant.label}
                        </button>
                    ))}
                </div>

                <div
                    className='my-1 border-t'
                    style={{ borderColor: 'var(--surface-card-border)' }}
                />

                <p className={LABEL_CLASS}>Go to</p>
                {navItems.map((item) =>
                    item.to ? (
                        <MenuItem key={item.label}>
                            <button
                                type='button'
                                onClick={() => navigate(item.to!)}
                                className={ITEM_CLASS}
                            >
                                {item.label}
                            </button>
                        </MenuItem>
                    ) : (
                        <p
                            key={item.label}
                            className='px-2 py-1.5 font-display text-[13px] text-text-faint'
                        >
                            {item.label}
                        </p>
                    )
                )}
            </ThemedMenuItems>
        </Menu>
    );
};
