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
};

// Accents ramp from a faint "Whenever" grey up to the hot "Needs-you-now" meter
// color.
export const PRIORITY_LEVELS: PriorityLevel[] = [
    {
        value: 0,
        label: 'None',
        description: 'No urgency. Stays in Whenever unless a due date pulls it up.',
        accent: 'var(--color-text-faint)'
    },
    {
        value: 1,
        label: 'Low',
        description: 'Minor. Usually Whenever.',
        accent: 'var(--color-whenever-text)'
    },
    {
        value: 2,
        label: 'Medium',
        description: 'Notable. Surfaces in Soon.',
        accent: 'var(--color-soon-meter)'
    },
    {
        value: 3,
        label: 'High',
        description: 'Urgent. Always in Needs-you-now.',
        accent: 'var(--color-now-meter)'
    }
];

/** Labels only, indexed by priority value — convenience view for chips/sections. */
export const PRIORITY_LABELS: string[] = PRIORITY_LEVELS.map((level) => level.label);
