import { describe, expect, it } from 'vitest';

import { EVERY_DAY, formatReminder, hasDay, toggleDay, weekdayColumns } from './weekday-mask';

describe('weekdayColumns', () => {
    it('orders Monday-first by default and Sunday-first on request', () => {
        expect(weekdayColumns(true).map((c) => c.py)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(weekdayColumns(false).map((c) => c.py)).toEqual([6, 0, 1, 2, 3, 4, 5]);
    });

    it('names each column by its weekday, Monday = 0', () => {
        expect(weekdayColumns(true)[0]).toMatchObject({ label: 'M', name: 'Monday' });
        expect(weekdayColumns(false)[0]).toMatchObject({ label: 'S', name: 'Sunday' });
    });
});

describe('hasDay / toggleDay', () => {
    it('reads and flips one bit per weekday', () => {
        const monWedFri = 0b10101;
        expect(hasDay(monWedFri, 0)).toBe(true);
        expect(hasDay(monWedFri, 1)).toBe(false);
        expect(toggleDay(monWedFri, 1)).toBe(0b10111);
        expect(toggleDay(monWedFri, 4)).toBe(0b00101);
    });

    it('never clears the last day, since the API rejects an empty mask', () => {
        expect(toggleDay(0b1000000, 6)).toBe(0b1000000);
        expect(toggleDay(EVERY_DAY, 3)).toBe(EVERY_DAY & ~(1 << 3));
    });
});

describe('formatReminder', () => {
    it('names the common day sets', () => {
        expect(formatReminder('08:30:00', EVERY_DAY)).toBe('08:30 daily');
        expect(formatReminder('08:30:00', 0b0011111)).toBe('08:30 weekdays');
        expect(formatReminder('08:30:00', 0b1100000)).toBe('08:30 weekends');
    });

    it('lists any other set Monday-first', () => {
        expect(formatReminder('21:05:00', 0b1010101)).toBe('21:05 M W F Su');
        expect(formatReminder('07:00', 0b0000010)).toBe('07:00 Tu');
    });
});
