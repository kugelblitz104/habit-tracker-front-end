import { describe, expect, it } from 'vitest';
import { buildMoodWeeks } from './mood-grid';

describe('buildMoodWeeks', () => {
    // 2026-11-25 is a Wednesday.
    it('starts each column on Monday and nulls days after today', () => {
        const weeks = buildMoodWeeks('2026-11-25', 2, true);

        expect(weeks).toHaveLength(2);
        expect(weeks[0]).toEqual([
            '2026-11-16',
            '2026-11-17',
            '2026-11-18',
            '2026-11-19',
            '2026-11-20',
            '2026-11-21',
            '2026-11-22'
        ]);
        expect(weeks[1]).toEqual([
            '2026-11-23',
            '2026-11-24',
            '2026-11-25',
            null,
            null,
            null,
            null
        ]);
    });

    it('starts on Sunday when the week does', () => {
        const weeks = buildMoodWeeks('2026-11-25', 1, false);

        expect(weeks[0]).toEqual([
            '2026-11-22',
            '2026-11-23',
            '2026-11-24',
            '2026-11-25',
            null,
            null,
            null
        ]);
    });

    it('fills a full last column when today ends the week', () => {
        const weeks = buildMoodWeeks('2026-11-29', 1, true);

        expect(weeks[0]![6]).toBe('2026-11-29');
        expect(weeks[0]![0]).toBe('2026-11-23');
    });
});
