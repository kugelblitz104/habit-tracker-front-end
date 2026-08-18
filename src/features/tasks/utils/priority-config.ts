import type { CSSProperties } from 'react';

/**
 * Single source of truth for the task priority taxonomy (0 = None … 3 = High).
 * Previously duplicated across task-controls, task-detail-body, task-context-menu
 * and task-form-fields — consolidated here so the label/accent/description ramp
 * only needs to change in one place.
 */

export type PriorityLevel = {
    value: number;
    label: string;
    /** Short description of this level's effect (feeds the server-computed band). */
    description: string;
    /** Accent reflecting the band this priority level tends to land in. */
    accent: string;
    /**
     * Colour for the priority column's text label and its meter bars. Not
     * `accent` above: two of those values (`--color-text-faint`,
     * `--color-whenever-text`) fall under 4.5:1 on the row hover surface, so
     * they cannot carry text. The three that can ramp grey -> amber -> orange,
     * so the level is readable from colour alone at a glance down the column.
     */
    labelStyle: CSSProperties;
};

// Accents ramp from a faint "Whenever" grey up to the hot "Needs-you-now" meter
// color.
export const PRIORITY_LEVELS: PriorityLevel[] = [
    {
        value: 0,
        label: 'None',
        description: "No urgency. Not brought up unless there's a due date.",
        accent: 'var(--color-text-faint)',
        labelStyle: { color: 'var(--color-text-muted)' }
    },
    {
        value: 1,
        label: 'Low',
        description: 'Minor. Usually Whenever.',
        accent: 'var(--color-whenever-text)',
        labelStyle: { color: 'var(--color-text-muted)', fontWeight: 400 }
    },
    {
        value: 2,
        label: 'Medium',
        description: 'Notable. Surfaces in Soon.',
        accent: 'var(--color-soon-meter)',
        labelStyle: { color: 'var(--color-soon-label)', fontWeight: 500 }
    },
    {
        value: 3,
        label: 'High',
        description: 'Urgent. Always needs you now.',
        accent: 'var(--color-now-meter)',
        labelStyle: { color: 'var(--color-now-accent)', fontWeight: 600 }
    }
];

/** Labels only, indexed by priority value — convenience view for chips/sections. */
export const PRIORITY_LABELS: string[] = PRIORITY_LEVELS.map((level) => level.label);

/** Column-width labels for the task row; the detail panel uses PRIORITY_LABELS. */
export const PRIORITY_SHORT_LABELS: string[] = ['', 'Low', 'Med', 'High'];
