import { describe, expect, it } from 'vitest';

import { formatDueColumn } from './due-column';

// A fixed local instant: 2026-08-13, 10:00 local.
const NOW = new Date(2026, 7, 13, 10, 0, 0);

const textOf = (date: string | null, time: string | null = null) =>
    formatDueColumn(date, time, NOW)?.text ?? null;

describe('formatDueColumn', () => {
    it('renders nothing without a due date', () => {
        expect(formatDueColumn(null, null, NOW)).toBeNull();
    });

    it('counts overdue days and says late, not overdue', () => {
        // "late" so three digits fit the 66px column; the detail panel keeps
        // "overdue".
        expect(textOf('2026-07-12')).toBe('32d late');
    });

    it('says Late for a timed task whose time passed today', () => {
        expect(textOf('2026-08-13', '09:00')).toBe('Late');
    });

    it('shows the live remaining time for a timed task due later today', () => {
        expect(textOf('2026-08-13', '15:30')).toBe('5h 30m');
    });

    it('says Today for an untimed task due today', () => {
        expect(textOf('2026-08-13')).toBe('Today');
    });

    it('says Tomorrow rather than 1d', () => {
        expect(textOf('2026-08-14')).toBe('Tomorrow');
    });

    it('counts days for anything further out', () => {
        expect(textOf('2026-08-20')).toBe('7d');
        expect(textOf('2026-09-30')).toBe('48d');
    });

    it('colours overdue with danger and today with the accent', () => {
        expect(formatDueColumn('2026-07-12', null, NOW)?.style.color).toBe('var(--color-danger)');
        expect(formatDueColumn('2026-08-13', null, NOW)?.style.color).toBe(
            'var(--color-now-accent)'
        );
        expect(formatDueColumn('2026-08-20', null, NOW)?.style.color).toBe(
            'var(--color-text-secondary)'
        );
    });

    it('fills a chip only while the date is still actionable', () => {
        const fillOf = (date: string) => formatDueColumn(date, null, NOW)?.style.backgroundColor;
        expect(fillOf('2026-07-12')).toBe('var(--due-late-bg)');
        expect(fillOf('2026-08-13')).toBe('var(--due-now-bg)');
        expect(fillOf('2026-08-14')).toBe('var(--due-now-bg)');
        // Two days out and beyond is plain text, so a fill down the column
        // always means "decide about this today".
        expect(fillOf('2026-08-15')).toBeUndefined();
        expect(fillOf('2026-09-30')).toBeUndefined();
    });
});
