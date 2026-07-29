import { describe, expect, it } from 'vitest';

import { formatClock, formatHumanDuration } from './format-duration';

describe('formatClock', () => {
    it('shows a bare MM:SS under an hour', () => {
        expect(formatClock(0)).toBe('00:00');
        expect(formatClock(7)).toBe('00:07');
        expect(formatClock(59)).toBe('00:59');
    });

    it('rolls into minutes at exactly 60 seconds', () => {
        expect(formatClock(60)).toBe('01:00');
        expect(formatClock(61)).toBe('01:01');
        expect(formatClock(599)).toBe('09:59');
    });

    it('switches from MM:SS to H:MM:SS at exactly 3600 seconds', () => {
        expect(formatClock(3599)).toBe('59:59');
        expect(formatClock(3600)).toBe('1:00:00');
        expect(formatClock(3601)).toBe('1:00:01');
    });

    it('leaves the hour field unpadded while padding minutes and seconds', () => {
        expect(formatClock(3661)).toBe('1:01:01');
        expect(formatClock(45296)).toBe('12:34:56');
        expect(formatClock(360000)).toBe('100:00:00');
    });

    it('floors fractional seconds instead of rounding', () => {
        expect(formatClock(0.9)).toBe('00:00');
        expect(formatClock(59.99)).toBe('00:59');
        expect(formatClock(3599.99)).toBe('59:59');
    });

    it('clamps a negative elapsed time to zero', () => {
        // Reachable from clock skew: a `started_at` a second in the browser's
        // future makes the live timer's `now - started` negative on first tick.
        expect(formatClock(-1)).toBe('00:00');
        expect(formatClock(-0.5)).toBe('00:00');
        expect(formatClock(-99999)).toBe('00:00');
    });

    it('propagates NaN rather than clamping it (characterisation)', () => {
        // `Math.max(0, NaN)` is NaN, so an unparseable `started_at` renders
        // 'NaN:NaN' instead of a zeroed clock. Guarding is the caller's job today.
        expect(formatClock(NaN)).toBe('NaN:NaN');
    });
});

describe('formatHumanDuration', () => {
    it('reports seconds only under a minute', () => {
        expect(formatHumanDuration(0)).toBe('0s');
        expect(formatHumanDuration(1)).toBe('1s');
        expect(formatHumanDuration(40)).toBe('40s');
        expect(formatHumanDuration(59)).toBe('59s');
    });

    it('drops the seconds once there is a whole minute', () => {
        expect(formatHumanDuration(60)).toBe('1m');
        expect(formatHumanDuration(90)).toBe('1m');
        expect(formatHumanDuration(1500)).toBe('25m');
        expect(formatHumanDuration(3599)).toBe('59m');
    });

    it('always prints the minutes field once there is an hour', () => {
        expect(formatHumanDuration(3600)).toBe('1h 0m');
        expect(formatHumanDuration(3660)).toBe('1h 1m');
        expect(formatHumanDuration(5100)).toBe('1h 25m');
        expect(formatHumanDuration(7380)).toBe('2h 3m');
        expect(formatHumanDuration(360000)).toBe('100h 0m');
    });

    it('floors fractional seconds', () => {
        expect(formatHumanDuration(59.9)).toBe('59s');
        expect(formatHumanDuration(90.7)).toBe('1m');
        expect(formatHumanDuration(3600.4)).toBe('1h 0m');
    });

    it('clamps a negative total to zero seconds', () => {
        expect(formatHumanDuration(-1)).toBe('0s');
        expect(formatHumanDuration(-3600)).toBe('0s');
    });

    it('propagates NaN rather than clamping it (characterisation)', () => {
        // Same `Math.max(0, NaN)` hole as formatClock — recorded so a future
        // guard shows up here as a deliberate change.
        expect(formatHumanDuration(NaN)).toBe('NaNs');
    });
});
