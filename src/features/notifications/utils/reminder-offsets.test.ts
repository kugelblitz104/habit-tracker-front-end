import { describe, expect, it } from 'vitest';
import {
    MAX_OFFSET_MINUTES,
    addOffset,
    modeToOffsets,
    offsetLabel,
    offsetProblem,
    offsetsToMode,
    toAmountAndUnit,
    toMinutes
} from './reminder-offsets';

describe('amount and unit', () => {
    it('stores amount * unit in minutes', () => {
        expect(toMinutes(2, 'weeks')).toBe(20160);
        expect(toMinutes(3, 'days')).toBe(4320);
        expect(toMinutes(2, 'hours')).toBe(120);
        expect(toMinutes(45, 'minutes')).toBe(45);
    });

    it('displays in the largest unit that divides evenly', () => {
        expect(toAmountAndUnit(1440)).toEqual({ amount: 1, unit: 'days' });
        expect(toAmountAndUnit(90)).toEqual({ amount: 90, unit: 'minutes' });
        expect(toAmountAndUnit(120)).toEqual({ amount: 2, unit: 'hours' });
        expect(toAmountAndUnit(MAX_OFFSET_MINUTES)).toEqual({ amount: 4, unit: 'weeks' });
        expect(toAmountAndUnit(1500)).toEqual({ amount: 25, unit: 'hours' });
    });

    it('round-trips every minute count in range', () => {
        for (const m of [0, 1, 15, 59, 60, 61, 90, 1440, 1441, 10080, MAX_OFFSET_MINUTES]) {
            const { amount, unit } = toAmountAndUnit(m);
            expect(toMinutes(amount, unit)).toBe(m);
        }
    });

    it('labels with singular and plural units', () => {
        expect(offsetLabel(1440)).toBe('1 day');
        expect(offsetLabel(2880)).toBe('2 days');
        expect(offsetLabel(60)).toBe('1 hour');
        expect(offsetLabel(90)).toBe('90 min');
        expect(offsetLabel(0)).toBe('At the time');
    });
});

describe('offset list rules', () => {
    it('accepts a valid new offset', () => {
        expect(offsetProblem([60], 15)).toBeNull();
        expect(offsetProblem([], MAX_OFFSET_MINUTES)).toBeNull();
    });

    it('rejects invalid, too long, duplicate and a sixth offset', () => {
        expect(offsetProblem([], Number.NaN)).toBe('invalid');
        expect(offsetProblem([], 1.5)).toBe('invalid');
        expect(offsetProblem([], -1)).toBe('invalid');
        expect(offsetProblem([], MAX_OFFSET_MINUTES + 1)).toBe('too-long');
        expect(offsetProblem([60], 60)).toBe('duplicate');
        expect(offsetProblem([1, 2, 3, 4, 5], 6)).toBe('full');
    });

    it('keeps the list longest first', () => {
        expect(addOffset([60, 5], 15)).toEqual([60, 15, 5]);
    });
});

describe('three-state mapping', () => {
    it('maps the stored value to a mode', () => {
        expect(offsetsToMode(null)).toBe('default');
        expect(offsetsToMode(undefined)).toBe('default');
        expect(offsetsToMode([])).toBe('none');
        expect(offsetsToMode([60])).toBe('custom');
    });

    it('maps a mode back to null, [] or the list', () => {
        expect(modeToOffsets('default', [60])).toBeNull();
        expect(modeToOffsets('none', [60])).toEqual([]);
        expect(modeToOffsets('custom', [60, 15])).toEqual([60, 15]);
    });

    it('keeps an explicit null when serialised', () => {
        expect(JSON.stringify({ due_reminder_offsets: modeToOffsets('default', []) })).toBe(
            '{"due_reminder_offsets":null}'
        );
    });
});
