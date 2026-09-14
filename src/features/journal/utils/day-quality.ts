/**
 * The day-quality vocabulary.
 *
 * These are semantic words, NOT a rating. A day can be productive and tiring
 * at once, so nothing here may render as stars, a slider or a 1-10 scale: any
 * such control forces a single axis onto a feeling that does not have one.
 * The wire type is `string` (the API stores plain text and validates
 * membership server-side), deliberately not a TS enum, so a word added
 * server-side needs no regenerated type here.
 */

export type DayQualityGroup = {
    key: string;
    /** Shown beside the cluster, so the colour reads as a tone and not a score. */
    label: string;
    /** CSS colour for the group's chips. */
    color: string;
    qualities: readonly string[];
};

/**
 * The words, written once, in picker order, split into three tonal bands.
 *
 * Three hues rather than a gradient from one colour to another: a ramp would
 * read as a scale, which is the thing this control refuses to be. Gold / blue
 * / rose are simply different, and the group label says what each one means.
 *
 * The words and their order mirror the server's `DayQuality` enum exactly. The
 * server validates membership, so a word offered here that it does not know is
 * a 422 on save.
 */
export const DAY_QUALITY_GROUPS: readonly DayQualityGroup[] = [
    {
        key: 'positive',
        label: 'positive',
        color: 'var(--color-soon-dot)',
        qualities: ['great', 'good', 'exciting', 'productive']
    },
    {
        key: 'neutral',
        label: 'neutral',
        color: 'var(--color-habit-label)',
        // `busy` and `mixed` sit here rather than in either band: neither says
        // whether the day was good.
        qualities: ['quiet', 'steady', 'busy', 'mixed']
    },
    {
        key: 'negative',
        label: 'negative',
        color: 'var(--color-danger)',
        qualities: ['tiring', 'draining', 'frustrating', 'stressful', 'rough']
    }
];

/** The vocabulary in picker order, derived so the words have one home. */
export const DAY_QUALITIES: readonly string[] = DAY_QUALITY_GROUPS.flatMap((group) => [
    ...group.qualities
]);

/** The group colour for a stored quality, or null for an unknown/absent one. */
export const dayQualityColor = (quality: string | null | undefined): string | null => {
    if (!quality) return null;
    const group = DAY_QUALITY_GROUPS.find((candidate) => candidate.qualities.includes(quality));
    return group?.color ?? null;
};
