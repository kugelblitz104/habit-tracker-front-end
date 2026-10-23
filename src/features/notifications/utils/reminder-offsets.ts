export const MAX_OFFSETS = 5;
/** Four weeks, the server's cap on one offset. */
export const MAX_OFFSET_MINUTES = 40320;

export type OffsetUnit = 'minutes' | 'hours' | 'days' | 'weeks';

/** Largest first, so the first unit that divides evenly is the display unit. */
const UNIT_MINUTES: ReadonlyArray<readonly [OffsetUnit, number]> = [
    ['weeks', 10080],
    ['days', 1440],
    ['hours', 60],
    ['minutes', 1]
];

export const OFFSET_UNITS: readonly OffsetUnit[] = ['minutes', 'hours', 'days', 'weeks'];

const UNIT_LABELS: Record<OffsetUnit, readonly [string, string]> = {
    minutes: ['min', 'min'],
    hours: ['hour', 'hours'],
    days: ['day', 'days'],
    weeks: ['week', 'weeks']
};

export const unitLabel = (unit: OffsetUnit, amount: number): string =>
    UNIT_LABELS[unit][amount === 1 ? 0 : 1];

export const toMinutes = (amount: number, unit: OffsetUnit): number =>
    amount * (UNIT_MINUTES.find(([u]) => u === unit)?.[1] ?? 1);

/** The largest unit that divides `minutes` evenly. The unit is never stored. */
export const toAmountAndUnit = (minutes: number): { amount: number; unit: OffsetUnit } => {
    const [unit, size] = UNIT_MINUTES.find(([, s]) => minutes % s === 0) ?? ['minutes', 1];
    return { amount: minutes / size, unit };
};

/** 1440 -> "1 day", 90 -> "90 min", 0 -> "At the time". */
export const offsetLabel = (minutes: number): string => {
    if (minutes === 0) return 'At the time';
    const { amount, unit } = toAmountAndUnit(minutes);
    return `${amount} ${unitLabel(unit, amount)}`;
};

export type OffsetProblem = 'invalid' | 'too-long' | 'duplicate' | 'full';

/** Why `minutes` cannot join `list`, or null when it can. */
export const offsetProblem = (list: readonly number[], minutes: number): OffsetProblem | null => {
    if (!Number.isInteger(minutes) || minutes < 0) return 'invalid';
    if (minutes > MAX_OFFSET_MINUTES) return 'too-long';
    if (list.includes(minutes)) return 'duplicate';
    if (list.length >= MAX_OFFSETS) return 'full';
    return null;
};

/** Longest lead first, matching how a reminder list reads ("1 day, 1 hour"). */
export const addOffset = (list: readonly number[], minutes: number): number[] =>
    [...list, minutes].sort((a, b) => b - a);

/** A task's reminder setting for one date: server default, none, or its own list. */
export type OffsetMode = 'default' | 'none' | 'custom';

export const offsetsToMode = (offsets: readonly number[] | null | undefined): OffsetMode =>
    offsets == null ? 'default' : offsets.length === 0 ? 'none' : 'custom';

/**
 * The PATCH value for a mode: Default is an explicit `null` (the server's cue to
 * clear the override, distinct from omitting the field), None is `[]`.
 */
export const modeToOffsets = (mode: OffsetMode, custom: readonly number[]): number[] | null =>
    mode === 'default' ? null : mode === 'none' ? [] : [...custom];
