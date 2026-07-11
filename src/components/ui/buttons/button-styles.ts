import type { CSSProperties } from 'react';

/**
 * Shared themed-button tokens. These live in `components/ui` (not a feature
 * folder) because they're consumed well outside Settings — the auth pages and
 * the account form use them too. `features/settings/components/settings-card`
 * re-exports them under their historical `settings*` names for compatibility.
 */

/**
 * Ghost button treatment ("Switch", "Manage", inline form cancels). Border
 * color comes via inline style so the exact design alpha is preserved.
 */
export const ghostButtonClass =
    'rounded-[8px] border px-3 py-1.5 text-[12.5px] text-text-secondary-soft transition-colors ' +
    'hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50';

export const ghostButtonBorder = 'rgba(255,255,255,.14)';

/** Primary gradient button (Save changes / Create profile / Sign in). */
export const primaryButtonClass =
    'inline-block rounded-[9px] px-[18px] py-2.5 text-[13.5px] font-semibold transition-opacity ' +
    'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

export const primaryButtonStyle: CSSProperties = {
    background: 'var(--button-primary-gradient)',
    color: 'var(--button-primary-text)'
};
