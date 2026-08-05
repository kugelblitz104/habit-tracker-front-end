import { describe, expect, it } from 'vitest';
import {
    DEFAULT_CATEGORY_COLOR,
    shouldSendColor,
    shouldSendRename,
    swatchColor
} from './category-edits';

describe('swatchColor', () => {
    it('passes a stored color through unchanged', () => {
        expect(swatchColor('#0EA5E9')).toBe('#0EA5E9');
    });

    it('falls back to the default for null', () => {
        expect(swatchColor(null)).toBe(DEFAULT_CATEGORY_COLOR);
    });

    it('falls back to the default for undefined', () => {
        expect(swatchColor(undefined)).toBe(DEFAULT_CATEGORY_COLOR);
    });

    it('falls back to the default for an empty string', () => {
        expect(swatchColor('')).toBe(DEFAULT_CATEGORY_COLOR);
    });
});

describe('shouldSendColor', () => {
    it('rejects an unchanged color', () => {
        expect(shouldSendColor('#0EA5E9', '#0EA5E9')).toBe(false);
    });

    it('rejects a color that differs only in hex case', () => {
        expect(shouldSendColor('#0EA5E9', '#0ea5e9')).toBe(false);
    });

    it('rejects the fallback on a colourless category, so touching the swatch sends nothing', () => {
        expect(shouldSendColor(null, DEFAULT_CATEGORY_COLOR)).toBe(false);
        expect(shouldSendColor(undefined, DEFAULT_CATEGORY_COLOR)).toBe(false);
    });

    it('accepts a first color on a colourless category', () => {
        expect(shouldSendColor(null, '#0EA5E9')).toBe(true);
    });

    it('accepts a genuinely different color', () => {
        expect(shouldSendColor('#0EA5E9', '#FF0000')).toBe(true);
    });
});

describe('shouldSendRename', () => {
    it('rejects an unchanged name', () => {
        expect(shouldSendRename('Bills', 'Bills')).toBe(false);
    });

    it('rejects a whitespace-only name', () => {
        expect(shouldSendRename('Bills', '   ')).toBe(false);
    });

    it('rejects a name that trims equal to the current one', () => {
        expect(shouldSendRename('Bills', '  Bills  ')).toBe(false);
    });

    it('accepts a genuinely different name', () => {
        expect(shouldSendRename('Bills', 'Subscriptions')).toBe(true);
    });

    it('trims the new name before comparing, but accepts the change', () => {
        expect(shouldSendRename('Bills', '  Subscriptions  ')).toBe(true);
    });

    it('accepts a case-only change, since the server matches case-sensitively', () => {
        expect(shouldSendRename('Bills', 'bills')).toBe(true);
    });
});
