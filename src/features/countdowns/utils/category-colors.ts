import type { CountdownCategoryRead, CountdownRead } from '@/api';

/** Group name shown for countdowns with no category. */
export const UNCATEGORIZED = 'Other';

/** Trimmed group name for a countdown, falling back to "Other". */
export const catOf = (category: string | null | undefined) => category?.trim() || UNCATEGORIZED;

/**
 * Category id to colour, from the profile's category records. Keyed by id, not
 * by name: the name is renameable and `Countdown.category` only mirrors it, so
 * an id join survives a rename that has not yet reached both caches. A category
 * with no colour is present with `undefined`, which callers render as the faint
 * default.
 */
export const buildCategoryColorMap = (
    categories: CountdownCategoryRead[]
): Map<number, string | undefined> => new Map(categories.map((c) => [c.id, c.color ?? undefined]));

/**
 * Colour for a countdown's group. `undefined` when the countdown is
 * uncategorised or its category is not in the map, which callers render as the
 * faint default.
 */
export const colorOf = (
    colorFor: Map<number, string | undefined>,
    categoryId: CountdownRead['category_id']
): string | undefined => (categoryId == null ? undefined : colorFor.get(categoryId));

/**
 * Left-border accent for a countdown card: its group's colour, or the plain card
 * border when the countdown has no group or the group has no colour. A card
 * never carries a colour of its own, so a group's members always match.
 */
export const cardAccent = (categoryColor: string | undefined): string =>
    categoryColor ?? 'var(--surface-card-border)';

/**
 * Colour for a group of countdowns, from the first member that has a
 * `category_id`. `catOf` files both an absent category and a category literally
 * named "Other" into one group, so a group's members can be a mix of linked and
 * uncategorised ones in any order. `undefined` when no member is linked, which
 * callers render as the faint default.
 */
export const colorOfGroup = (
    colorFor: Map<number, string | undefined>,
    categoryIds: Iterable<CountdownRead['category_id']>
): string | undefined => {
    for (const categoryId of categoryIds) {
        if (categoryId != null) return colorOf(colorFor, categoryId);
    }
    return undefined;
};
