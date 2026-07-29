import { describe, expect, it } from 'vitest';

import { getFrequencyString } from './frequency-label';

describe('getFrequencyString', () => {
    it('calls a habit daily when the goal equals the window', () => {
        expect(getFrequencyString(1, 1)).toBe('daily');
        expect(getFrequencyString(7, 7)).toBe('daily');
        expect(getFrequencyString(30, 30)).toBe('daily');
    });

    it('names the once-a-week and once-a-month shapes', () => {
        expect(getFrequencyString(1, 7)).toBe('weekly');
        expect(getFrequencyString(1, 30)).toBe('monthly');
    });

    it('spells out any other once-per-window goal', () => {
        expect(getFrequencyString(1, 2)).toBe('once every 2 days');
        expect(getFrequencyString(1, 14)).toBe('once every 14 days');
        // There's no yearly branch, so 365 stays generic.
        expect(getFrequencyString(1, 365)).toBe('once every 365 days');
    });

    it('spells out multi-times-per-window goals', () => {
        expect(getFrequencyString(3, 7)).toBe('3 times every 7 days');
        expect(getFrequencyString(2, 30)).toBe('2 times every 30 days');
    });

    it('renders an impossible goal literally rather than clamping (characterisation)', () => {
        // frequency > range can't be produced by the habit form; the final `else`
        // still describes it verbatim instead of collapsing it to 'daily'.
        expect(getFrequencyString(10, 7)).toBe('10 times every 7 days');
    });
});
