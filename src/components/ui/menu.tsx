import { MenuItems, type MenuItemsProps } from '@headlessui/react';
import type { CSSProperties } from 'react';

/**
 * Shared themed dropdown/popover chrome. The app hand-rolled this same panel
 * treatment (dark `--bg` surface, card-border hairline, `p-1` + popover shadow)
 * in half a dozen places across headless `Menu` and `Popover` usages. These
 * exports centralize it:
 *  - `POPOVER_PANEL_CLASS` / `popoverPanelStyle` — drop onto any `MenuItems`,
 *    `PopoverPanel`, `MenuItems`-like surface (set your own width class too).
 *  - `ThemedMenuItems` — a thin `MenuItems` wrapper that applies both for the
 *    common headless `Menu` case; pass a width via `className`.
 */
export const POPOVER_PANEL_CLASS = 'z-50 rounded-button border p-1 shadow-popover outline-none';

/**
 * Open/close motion for a floating panel. Needs the `transition` prop on the
 * Headless panel; the origin follows the side Headless reports in `data-anchor`.
 */
export const POPOVER_MOTION_CLASS =
    "motion-safe:transition motion-safe:duration-[140ms] motion-safe:ease-settle motion-safe:data-leave:duration-[80ms] motion-safe:data-closed:scale-[0.98] motion-safe:data-closed:opacity-0 motion-safe:data-[anchor^=bottom]:data-closed:-translate-y-1 motion-safe:data-[anchor^=top]:data-closed:translate-y-1 data-[anchor='bottom_start']:origin-top-left data-[anchor='bottom_end']:origin-top-right data-[anchor='top_start']:origin-bottom-left data-[anchor='top_end']:origin-bottom-right";

export const popoverPanelStyle: CSSProperties = {
    backgroundColor: 'var(--bg)',
    borderColor: 'var(--surface-card-border)'
};

/** Shared item row (icon + label, focus highlight) used inside the panels. */
export const MENU_ITEM_CLASS =
    'flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left font-display text-body text-text-secondary data-focus:bg-white/5';

export const ThemedMenuItems = ({ className = '', style, ...props }: MenuItemsProps) => (
    <MenuItems
        transition
        className={`${POPOVER_PANEL_CLASS} ${POPOVER_MOTION_CLASS} ${className}`}
        style={{ ...popoverPanelStyle, ...(style as CSSProperties) }}
        {...props}
    />
);
