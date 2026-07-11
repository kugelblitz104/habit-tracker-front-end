import type { CSSProperties } from 'react';

/**
 * Shared themed-input tokens for the non-react-hook-form inline forms (Account,
 * connections, new-profile, auth pages). Live in `components/ui` because they're
 * used across features; `settings-card` re-exports them under their historical
 * `settings*` names for compatibility.
 */

/** Mono uppercase section-label color from the Settings design frame. */
export const SECTION_LABEL_COLOR = '#a5988a';

export const themedInputClass =
    'w-full rounded-[9px] border px-3 py-2.5 font-display text-[14px] text-text-primary ' +
    'outline-none transition-colors placeholder:text-text-faint focus-visible:ring-1 ' +
    'focus-visible:ring-now-accent';

export const themedInputStyle: CSSProperties = {
    backgroundColor: 'rgba(255,255,255,.04)',
    borderColor: 'rgba(255,255,255,.1)'
};

export const fieldLabelClass = 'mb-1.5 block text-[11.5px]';

export const fieldLabelStyle: CSSProperties = { color: '#9a8f81' };
