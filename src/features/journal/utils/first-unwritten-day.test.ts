import { describe, expect, it } from 'vitest';
import { firstUnwrittenDay } from './first-unwritten-day';

const entry = (entry_date: string, body: string | null = 'x') => ({
    entry_date,
    body,
    gratitude: null,
    day_quality: null
});

describe('firstUnwrittenDay', () => {
    it('returns the day after the latest written entry', () => {
        // Monday written, Tuesday through Sunday not.
        expect(firstUnwrittenDay([entry('2026-11-16')], '2026-11-22')).toBe('2026-11-17');
    });

    it('ignores rows with every field empty', () => {
        expect(
            firstUnwrittenDay([entry('2026-11-20', '  '), entry('2026-11-16')], '2026-11-22')
        ).toBe('2026-11-17');
    });

    it('is null when today is written', () => {
        expect(firstUnwrittenDay([entry('2026-11-22')], '2026-11-22')).toBeNull();
    });

    it('is null with nothing written', () => {
        expect(firstUnwrittenDay([], '2026-11-22')).toBeNull();
    });

    it('ignores entries after today', () => {
        expect(firstUnwrittenDay([entry('2026-11-25'), entry('2026-11-20')], '2026-11-22')).toBe(
            '2026-11-21'
        );
    });
});
