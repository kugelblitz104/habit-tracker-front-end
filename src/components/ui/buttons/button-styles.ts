import type { CSSProperties } from 'react';

/**
 * Shared themed-button tokens. These live in `components/ui` (not a feature
 * folder) because they're consumed across features - the auth pages and the
 * account form use them too, not only Settings - and every consumer imports
 * them directly from this module.
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

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'icon';

/**
 * Size tiers. `min-h` is the primary token and the font size is secondary:
 * the tiers exist to clear WCAG 2.2 SC 2.5.8 (24px, AA) on a mouse and
 * SC 2.5.5 (44px) on touch, NOT to reproduce the font sizes already in the
 * code. `pointer-coarse:` is a native Tailwind 4.1 variant.
 *
 * `lg` keeps the historical `primaryButtonClass` padding and font so primary
 * submits keep their proportions; the 44px floor still grows them from the
 * 40.3px they measure today.
 */
const SIZE: Record<ButtonSize, string> = {
    sm: 'min-h-[28px] pointer-coarse:min-h-[44px] px-2.5 py-1.5 text-[11px]',
    md: 'min-h-[36px] pointer-coarse:min-h-[44px] px-3 py-2 text-[12px]',
    lg: 'min-h-[44px] pointer-coarse:min-h-[48px] px-[18px] py-2.5 text-[13.5px]'
};

/** Square minimums for icon-only buttons, which have no text to widen them. */
const ICON_WIDTH: Record<ButtonSize, string> = {
    sm: 'min-w-[28px] pointer-coarse:min-w-[44px]',
    md: 'min-w-[36px] pointer-coarse:min-w-[44px]',
    lg: 'min-w-[44px] pointer-coarse:min-w-[48px]'
};

const VARIANT: Record<ButtonVariant, string> = {
    primary: 'rounded-[9px] font-semibold transition-opacity hover:opacity-90',
    ghost: 'rounded-[8px] border text-text-secondary-soft transition-colors hover:text-text-primary',
    subtle: 'rounded-button text-text-faint transition-colors hover:text-text-secondary',
    icon: 'rounded-button border text-text-secondary transition-colors hover:text-text-primary'
};

const BASE =
    'inline-flex items-center justify-center gap-1.5 outline-none ' +
    'focus-visible:ring-1 focus-visible:ring-now-accent ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

export const buttonClass = ({
    size = 'md',
    variant = 'ghost',
    expandHitArea = false
}: {
    size?: ButtonSize;
    variant?: ButtonVariant;
    expandHitArea?: boolean;
} = {}): string =>
    [
        BASE,
        SIZE[size],
        VARIANT[variant],
        variant === 'icon' ? ICON_WIDTH[size] : '',
        expandHitArea ? 'hit-target' : ''
    ]
        .filter(Boolean)
        .join(' ');

export const buttonStyle = (variant: ButtonVariant): CSSProperties | undefined => {
    if (variant === 'primary') return primaryButtonStyle;
    if (variant === 'ghost' || variant === 'icon') return { borderColor: ghostButtonBorder };
    return undefined;
};
