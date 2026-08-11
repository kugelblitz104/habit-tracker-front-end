import { describe, expect, it } from 'vitest';
import { compareSemver } from './compare-semver';

describe('compareSemver', () => {
    it('orders by each part in turn', () => {
        expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
        expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
        expect(compareSemver('1.0.2', '1.0.10')).toBeLessThan(0);
    });

    it('treats equal versions as equal', () => {
        expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    });

    // The reason this isn't a string comparison.
    it('does not order numerically-larger parts as strings', () => {
        expect('1.10.0' > '1.9.0').toBe(false);
        expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    });

    it('sorts a list newest-first when reversed', () => {
        const versions = ['1.0.0', '2.0.0', '1.10.0', '1.9.0'];
        expect([...versions].sort((a, b) => compareSemver(b, a))).toEqual([
            '2.0.0',
            '1.10.0',
            '1.9.0',
            '1.0.0'
        ]);
    });
});
