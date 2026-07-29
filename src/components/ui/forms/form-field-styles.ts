import type { CSSProperties } from 'react';

/**
 * Shared field primitives for task forms. Extracted from `TaskEditor` so the
 * quick-capture expanded form (`TaskCaptureForm`) renders visually identical
 * fields; both forms import from here.
 */

export const formLabelClass =
    'mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

export const formFieldClass =
    'w-full rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent';

export const formFieldStyle: CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)'
};

/**
 * Explicit colors for native <option>s. Some platforms render the option popup
 * with the system (white) background regardless of the select's color-scheme,
 * which left our light option text invisible (white-on-white). Setting an
 * opaque dark background + light text on each option fixes it everywhere.
 */
export const selectOptionStyle: CSSProperties = {
    backgroundColor: '#1c1710',
    color: 'var(--color-text-primary)'
};

/** Compact 12px-scale tier (countdown form, manual time entry, inline log rows) —
 *  same visual language as `formFieldClass`/`formFieldStyle` but without the
 *  `w-full` and with tighter `px-2 py-1` padding for dense inline rows. */
export const compactFieldClass =
    'rounded-button border px-2 py-1 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent';

export const compactFieldStyle: CSSProperties = {
    ...formFieldStyle,
    colorScheme: 'dark'
};
