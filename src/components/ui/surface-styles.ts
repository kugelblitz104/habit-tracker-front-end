import type { CSSProperties } from 'react';

/**
 * Shared card-surface tokens. Most sites use both `CARD_SURFACE_CLASS` and
 * `CARD_SURFACE_STYLE`; sites whose class string differs from the plain
 * `rounded-card border p-4` (extra margin/width utilities, a different padding
 * scale, etc.) keep their own class string and import only the style object.
 */

export const CARD_SURFACE_CLASS = 'rounded-card border p-4';

export const CARD_SURFACE_STYLE: CSSProperties = {
    backgroundColor: 'var(--surface-card-bg)',
    borderColor: 'var(--surface-card-border)'
};
