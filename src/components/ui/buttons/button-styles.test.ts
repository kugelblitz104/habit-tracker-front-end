import { describe, expect, it } from 'vitest';
import { buttonClass, buttonStyle, ghostButtonBorder } from './button-styles';

describe('buttonClass', () => {
    it('defaults to the md ghost tier', () => {
        const c = buttonClass({});
        expect(c).toContain('min-h-[36px]');
        expect(c).toContain('pointer-coarse:min-h-[44px]');
        expect(c).toContain('text-[12px]');
    });

    it('clears the 24px AA floor on every size at a fine pointer', () => {
        for (const size of ['sm', 'md', 'lg'] as const) {
            const c = buttonClass({ size });
            // Anchored so a `pointer-coarse:min-h-[…]` token can't satisfy the
            // plain fine-pointer assertion; an unanchored match would still
            // find "min-h-[44px]" inside "pointer-coarse:min-h-[44px]".
            const m = c.match(/(?:^|\s)min-h-\[(\d+)px\]/);
            expect(m, `size ${size} declares no min-h`).not.toBeNull();
            expect(Number(m![1])).toBeGreaterThanOrEqual(24);
        }
    });

    it('clears the 44px touch floor on every size at a coarse pointer', () => {
        for (const size of ['sm', 'md', 'lg'] as const) {
            const c = buttonClass({ size });
            const m = c.match(/pointer-coarse:min-h-\[(\d+)px\]/);
            expect(m, `size ${size} declares no coarse min-h`).not.toBeNull();
            expect(Number(m![1])).toBeGreaterThanOrEqual(44);
        }
    });

    it('makes icon buttons square by also flooring min-width', () => {
        for (const size of ['sm', 'md', 'lg'] as const) {
            const c = buttonClass({ variant: 'icon', size });
            // Anchored for the same reason as the min-h assertion above: a
            // `pointer-coarse:min-w-[…]` token must not satisfy the plain match.
            const fine = c.match(/(?:^|\s)min-w-\[(\d+)px\]/);
            const coarse = c.match(/pointer-coarse:min-w-\[(\d+)px\]/);
            expect(fine, `size ${size} declares no min-w`).not.toBeNull();
            expect(coarse, `size ${size} declares no coarse min-w`).not.toBeNull();
            expect(Number(fine![1])).toBeGreaterThanOrEqual(24);
            expect(Number(coarse![1])).toBeGreaterThanOrEqual(44);
        }
    });

    it('adds the hit-target utility only when asked', () => {
        expect(buttonClass({ expandHitArea: true })).toContain('hit-target');
        expect(buttonClass({})).not.toContain('hit-target');
    });

    it('keeps lg on the historical primary padding and font', () => {
        const c = buttonClass({ size: 'lg', variant: 'primary' });
        expect(c).toContain('px-[18px]');
        expect(c).toContain('py-2.5');
        expect(c).toContain('text-[13.5px]');
    });

    it('pins every buttonStyle branch: primary gradient, ghost/icon border, subtle none', () => {
        expect(buttonStyle('primary')).toMatchObject({
            background: 'var(--button-primary-gradient)'
        });
        expect(buttonStyle('ghost')).toEqual({ borderColor: ghostButtonBorder });
        expect(buttonStyle('icon')).toEqual({ borderColor: ghostButtonBorder });
        expect(buttonStyle('subtle')).toBeUndefined();
    });
});
