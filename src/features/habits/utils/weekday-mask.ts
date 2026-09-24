/**
 * `Habit.reminder_days` is a 7-bit weekday mask indexed by Python weekday:
 * bit 0 = Monday ... bit 6 = Sunday. 127 is every day; the API rejects 0.
 */
export const EVERY_DAY = 127;
const WEEKDAYS = 0b0011111;
const WEEKENDS = 0b1100000;

export type WeekdayColumn = { label: string; short: string; name: string; py: number };

const MONDAY_FIRST: WeekdayColumn[] = [
    { label: 'M', short: 'M', name: 'Monday', py: 0 },
    { label: 'T', short: 'Tu', name: 'Tuesday', py: 1 },
    { label: 'W', short: 'W', name: 'Wednesday', py: 2 },
    { label: 'T', short: 'Th', name: 'Thursday', py: 3 },
    { label: 'F', short: 'F', name: 'Friday', py: 4 },
    { label: 'S', short: 'Sa', name: 'Saturday', py: 5 },
    { label: 'S', short: 'Su', name: 'Sunday', py: 6 }
];
const SUNDAY_FIRST: WeekdayColumn[] = [MONDAY_FIRST[6]!, ...MONDAY_FIRST.slice(0, 6)];

/** Display columns in the profile's week order, each carrying its Python weekday. */
export const weekdayColumns = (weekStartMonday: boolean): WeekdayColumn[] =>
    weekStartMonday ? MONDAY_FIRST : SUNDAY_FIRST;

export const hasDay = (mask: number, py: number): boolean => ((mask >> py) & 1) === 1;

/** Flip one weekday, refusing to clear the last one. */
export const toggleDay = (mask: number, py: number): number => {
    const next = mask ^ (1 << py);
    return next === 0 ? mask : next;
};

/** "08:30 daily" / "08:30 weekdays" / "08:30 Mon Wed Fri" from an API time and mask. */
export const formatReminder = (time: string, mask: number): string => {
    const hhmm = time.slice(0, 5);
    if (mask === EVERY_DAY) return `${hhmm} daily`;
    if (mask === WEEKDAYS) return `${hhmm} weekdays`;
    if (mask === WEEKENDS) return `${hhmm} weekends`;
    const days = MONDAY_FIRST.filter((c) => hasDay(mask, c.py)).map((c) => c.short);
    return `${hhmm} ${days.join(' ')}`;
};
