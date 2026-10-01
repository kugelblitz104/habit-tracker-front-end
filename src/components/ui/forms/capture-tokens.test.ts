import { describe, expect, it } from 'vitest';
import { matchByName, removeSegmentToken } from './capture-tokens';

const segs = (...parts: [string, string][]) => parts.map(([text, type]) => ({ text, type }));

describe('removeSegmentToken', () => {
    it('drops the token and its trailing space', () => {
        expect(
            removeSegmentToken(
                segs(
                    ['Call mum', 'text'],
                    [' ', 'text'],
                    ['>fri', 'date'],
                    [' ', 'text'],
                    ['soon', 'text']
                ),
                'date'
            )
        ).toBe('Call mum soon');
    });

    it('drops the leading space when the token ends the input', () => {
        expect(
            removeSegmentToken(segs(['Call mum', 'text'], [' ', 'text'], ['>fri', 'date']), 'date')
        ).toBe('Call mum');
    });

    it('trims leading whitespace left by a first-position token', () => {
        expect(
            removeSegmentToken(
                segs(['!high', 'priority'], [' ', 'text'], ['Ship', 'text']),
                'priority'
            )
        ).toBe('Ship');
    });

    it('is null when no token of that type exists', () => {
        expect(removeSegmentToken(segs(['Ship', 'text']), 'date')).toBeNull();
    });
});

describe('matchByName', () => {
    const items = [
        { id: 1, name: 'Marketing' },
        { id: 2, name: 'Work' },
        { id: 3, name: 'Work travel' }
    ];

    it('prefers an exact case-insensitive match over a prefix', () => {
        expect(matchByName(items, 'work')).toBe(2);
    });

    it('takes a unique prefix', () => {
        expect(matchByName(items, 'mark')).toBe(1);
        expect(matchByName(items, 'work t')).toBe(3);
    });

    it('is null for an ambiguous prefix or no match', () => {
        expect(matchByName(items, 'wo')).toBeNull();
        expect(matchByName(items, 'zzz')).toBeNull();
    });
});
