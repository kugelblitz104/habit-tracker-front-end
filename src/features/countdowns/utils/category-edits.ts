/** Fallback swatch color for a category with no `color`, matching the countdown form's own fallback. */
export const DEFAULT_CATEGORY_COLOR = '#8a8177';

/** Color-input value for a category: its stored color, or the shared fallback when null/empty. */
export const swatchColor = (color: string | null | undefined): string =>
    color || DEFAULT_CATEGORY_COLOR;

/**
 * True when a colour change should be sent to the server: the picked value
 * differs from what the swatch already showed. Compared case-insensitively
 * because the native colour input always reports lowercase hex while a stored
 * colour may be upper. A colourless category left sitting on the fallback sends
 * nothing.
 */
export const shouldSendColor = (
    currentColor: string | null | undefined,
    nextColor: string
): boolean => nextColor.toLowerCase() !== swatchColor(currentColor).toLowerCase();

/**
 * True when a rename should be sent to the server: the trimmed next name is
 * non-blank and differs from the current name. Case-only changes DO count as
 * a rename, since the server matches names case-sensitively.
 */
export const shouldSendRename = (currentName: string, nextName: string): boolean => {
    const trimmed = nextName.trim();
    return trimmed.length > 0 && trimmed !== currentName;
};
