import { describe, expect, it } from 'vitest';
import {
    buildCategoryColorMap,
    buildCategoryNameMap,
    cardAccent,
    colorOf,
    nameOf,
    UNCATEGORIZED
} from './category-colors';

const cat = (id: number, name: string, color: string | null) =>
    ({ id, profile_id: 1, name, color }) as never;

describe('buildCategoryColorMap', () => {
    it('maps an id to its colour', () => {
        const map = buildCategoryColorMap([cat(7, 'Bills', '#0EA5E9')]);
        expect(map.get(7)).toBe('#0EA5E9');
    });

    it('leaves a colourless category undefined rather than absent', () => {
        const map = buildCategoryColorMap([cat(7, 'Bills', null)]);
        expect(map.has(7)).toBe(true);
        expect(map.get(7)).toBeUndefined();
    });

    it('keeps two records whose names differ only by case apart, as the server does', () => {
        const map = buildCategoryColorMap([cat(7, 'Bills', '#0EA5E9'), cat(8, 'bills', '#FF0000')]);
        expect(map.get(7)).toBe('#0EA5E9');
        expect(map.get(8)).toBe('#FF0000');
    });

    it('is not keyed by name, so a renamed record keeps its colour', () => {
        const map = buildCategoryColorMap([cat(7, 'Utilities', '#0EA5E9')]);
        expect(map.get(7)).toBe('#0EA5E9');
        expect(map.size).toBe(1);
    });
});

describe('colorOf', () => {
    const map = buildCategoryColorMap([cat(7, 'Bills', '#0EA5E9'), cat(8, 'Empty', null)]);

    it('returns the record colour for a linked countdown', () => {
        expect(colorOf(map, 7)).toBe('#0EA5E9');
    });

    it('returns undefined for a colourless category', () => {
        expect(colorOf(map, 8)).toBeUndefined();
    });

    it('returns undefined for an uncategorised countdown', () => {
        expect(colorOf(map, null)).toBeUndefined();
        expect(colorOf(map, undefined)).toBeUndefined();
    });

    it('returns undefined for a category missing from the map', () => {
        expect(colorOf(map, 999)).toBeUndefined();
    });
});

describe('cardAccent', () => {
    const FALLBACK = 'var(--surface-card-border)';

    it('uses the group colour', () => {
        expect(cardAccent('#00FF00')).toBe('#00FF00');
    });

    it('falls back to the card border with no group colour', () => {
        expect(cardAccent(undefined)).toBe(FALLBACK);
    });
});

describe('buildCategoryNameMap', () => {
    it('maps id to name', () => {
        const map = buildCategoryNameMap([cat(1, 'Bills', '#0EA5E9'), cat(2, 'Other', null)]);
        expect(map.get(1)).toBe('Bills');
        expect(map.get(2)).toBe('Other');
    });
});

describe('nameOf', () => {
    const map = buildCategoryNameMap([cat(1, 'Bills', '#0EA5E9'), cat(2, 'Other', null)]);

    it('returns the record name for a linked countdown', () => {
        expect(nameOf(map, 1)).toBe('Bills');
    });

    it('falls back to Other when the countdown has no group', () => {
        expect(nameOf(map, null)).toBe(UNCATEGORIZED);
    });

    it('keeps a group actually named Other distinct from the ungrouped fallback', () => {
        // Same label, different sections: the section key is the id, not the name.
        expect(nameOf(map, 2)).toBe('Other');
    });
});
