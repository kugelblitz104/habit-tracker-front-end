import { describe, expect, it } from 'vitest';
import {
    buildCategoryColorMap,
    cardAccent,
    catOf,
    colorOf,
    colorOfGroup,
    UNCATEGORIZED
} from './category-colors';

const cat = (id: number, name: string, color: string | null) =>
    ({ id, profile_id: 1, name, color }) as never;

describe('catOf', () => {
    it('passes a plain name through unchanged', () => {
        expect(catOf('Bills')).toBe('Bills');
    });

    it('trims surrounding whitespace', () => {
        expect(catOf('  Bills  ')).toBe('Bills');
    });

    it('falls back to UNCATEGORIZED for a whitespace-only string', () => {
        expect(catOf('   ')).toBe(UNCATEGORIZED);
    });

    it('falls back to UNCATEGORIZED for null and undefined', () => {
        expect(catOf(null)).toBe(UNCATEGORIZED);
        expect(catOf(undefined)).toBe(UNCATEGORIZED);
    });

    it('preserves case, keeping "bills" and "Bills" distinct', () => {
        expect(catOf('bills')).toBe('bills');
        expect(catOf('Bills')).toBe('Bills');
        expect(catOf('bills')).not.toBe(catOf('Bills'));
    });
});

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

describe('colorOfGroup', () => {
    const map = buildCategoryColorMap([cat(7, 'Other', '#FF0000'), cat(8, 'Empty', null)]);

    it('takes the colour of the first linked member', () => {
        expect(colorOfGroup(map, [7])).toBe('#FF0000');
    });

    it('finds the linked member when an uncategorised one comes first', () => {
        expect(colorOfGroup(map, [null, 7])).toBe('#FF0000');
    });

    it('resolves the same colour whichever order the members arrive in', () => {
        expect(colorOfGroup(map, [null, 7])).toBe(colorOfGroup(map, [7, null]));
    });

    it('skips undefined as well as null', () => {
        expect(colorOfGroup(map, [undefined, null, 7])).toBe('#FF0000');
    });

    it('returns undefined when no member is linked', () => {
        expect(colorOfGroup(map, [null, null])).toBeUndefined();
    });

    it('returns undefined for an empty group', () => {
        expect(colorOfGroup(map, [])).toBeUndefined();
    });

    it('returns undefined when the linked category has no colour', () => {
        expect(colorOfGroup(map, [null, 8])).toBeUndefined();
    });
});
