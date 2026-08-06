import type { CountdownCategoryRead, CountdownRead } from '@/api';

/** Group name shown for countdowns with no category. */
export const UNCATEGORIZED = 'Other';

/**
 * Category id to colour, from the profile's category records. Keyed by id so a
 * rename of the category takes effect everywhere without needing a separate
 * cache update. A category with no colour is present with `undefined`, which
 * callers render as the faint default.
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
 * Category id to name, from the profile's category records. The grouped view
 * keys sections on the id, so a group literally named "Other" stays distinct
 * from the ungrouped fallback that shares its label.
 */
export const buildCategoryNameMap = (categories: CountdownCategoryRead[]): Map<number, string> =>
    new Map(categories.map((c) => [c.id, c.name]));

/** Group name for a countdown, falling back to "Other" when it has no group. */
export const nameOf = (
    nameFor: Map<number, string>,
    categoryId: CountdownRead['category_id']
): string => (categoryId == null ? UNCATEGORIZED : (nameFor.get(categoryId) ?? UNCATEGORIZED));
