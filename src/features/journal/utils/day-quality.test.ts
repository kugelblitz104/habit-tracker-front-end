import { describe, expect, it } from 'vitest';
import { DAY_QUALITIES, DAY_QUALITY_GROUPS, dayQualityColor } from './day-quality';

describe('DAY_QUALITIES', () => {
    // Derived from the groups, so this is what pins the picker order: a word
    // moved, added or dropped inside a group fails here.
    // This is also the server's `DayQuality` enum, in its declaration order.
    // The server validates membership, so a word here it does not know is a
    // 422 on save and a word it has that is missing here is unreachable.
    it('is the picker order, exactly', () => {
        expect([...DAY_QUALITIES]).toEqual([
            'great',
            'good',
            'exciting',
            'productive',
            'quiet',
            'steady',
            'busy',
            'mixed',
            'tiring',
            'draining',
            'frustrating',
            'stressful',
            'rough'
        ]);
    });
});

describe('DAY_QUALITY_GROUPS', () => {
    it('lists every word exactly once', () => {
        expect(new Set(DAY_QUALITIES).size).toBe(DAY_QUALITIES.length);
    });

    it('runs positive, then neutral, then negative', () => {
        expect(DAY_QUALITY_GROUPS.map((group) => group.key)).toEqual([
            'positive',
            'neutral',
            'negative'
        ]);
        expect(DAY_QUALITY_GROUPS.map((group) => group.label)).toEqual([
            'positive',
            'neutral',
            'negative'
        ]);
    });

    it('puts the four undecided words in the neutral band', () => {
        expect([...DAY_QUALITY_GROUPS[1]!.qualities]).toEqual(['quiet', 'steady', 'busy', 'mixed']);
    });

    it('gives every group its own colour', () => {
        const colors = DAY_QUALITY_GROUPS.map((group) => group.color);

        expect(new Set(colors).size).toBe(colors.length);
    });
});

describe('dayQualityColor', () => {
    it('resolves a word to its group colour', () => {
        expect(dayQualityColor('good')).toBe(DAY_QUALITY_GROUPS[0]!.color);
        expect(dayQualityColor('quiet')).toBe(DAY_QUALITY_GROUPS[1]!.color);
        expect(dayQualityColor('rough')).toBe(DAY_QUALITY_GROUPS[2]!.color);
    });

    it('returns null for "no quality yet" and for a word this client does not know', () => {
        expect(dayQualityColor(null)).toBeNull();
        expect(dayQualityColor(undefined)).toBeNull();
        expect(dayQualityColor('')).toBeNull();
        // The server may add a word before this client is regenerated; that
        // must render plainly, never throw.
        expect(dayQualityColor('serene')).toBeNull();
    });
});
