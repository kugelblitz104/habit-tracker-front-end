import type { CSSProperties } from 'react';

/**
 * Shared recharts `<Tooltip>` theme, duplicated byte-identically across the
 * insights charts and `project-analytics.tsx`. Each chart still supplies its
 * own `formatter`/`labelFormatter` — those are data-specific.
 */

export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--surface-card-border)',
    borderRadius: 8,
    fontSize: 11
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = { color: 'var(--color-text-muted)' };

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = { color: 'var(--color-text-secondary)' };

/** Bar-chart hover cursor fill; the pie chart (`time-by-project-chart`) doesn't
 *  use a cursor at all, so it does not import this. */
export const CHART_CURSOR_FILL = { fill: 'rgba(255,255,255,0.04)' };
