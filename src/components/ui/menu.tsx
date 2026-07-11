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
export const POPOVER_PANEL_CLASS =
    'z-50 rounded-button border p-1 shadow-popover outline-none';

export const popoverPanelStyle: CSSProperties = {
    backgroundColor: 'var(--bg)',
    borderColor: 'var(--surface-card-border)'
};

/** Shared item row (icon + label, focus highlight) used inside the panels. */
export const MENU_ITEM_CLASS =
    'flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left font-display text-[14px] text-text-secondary data-focus:bg-white/5';

export const ThemedMenuItems = ({ className = '', style, ...props }: MenuItemsProps) => (
    <MenuItems
        className={`${POPOVER_PANEL_CLASS} ${className}`}
        style={{ ...popoverPanelStyle, ...(style as CSSProperties) }}
        {...props}
    />
);
