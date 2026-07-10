/**
 * Small curated palette for quick-created projects. Quick-create flows (the
 * /projects capture bar and the task form's inline "＋ New project…") only ask
 * for a name, so the color is picked at random from these theme-friendly hexes;
 * it stays editable afterwards via the project editor.
 */
export const PROJECT_COLOR_PALETTE = [
    '#e0884a', // ember orange
    '#c98f4e', // soon amber
    '#7fa8c9', // habit cool blue
    '#6fa8e5', // scheduled blue
    '#b98fe6', // violet
    '#e0607a', // rose
    '#5fb08a', // sage green
    '#c9663f' // burnt sienna
] as const;

export const randomProjectColor = (): string =>
    PROJECT_COLOR_PALETTE[Math.floor(Math.random() * PROJECT_COLOR_PALETTE.length)]!;

/** Mirrors the backend's color validation (`^#[0-9A-Fa-f]{6}$`). */
export const isHexColor = (value: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(value);
