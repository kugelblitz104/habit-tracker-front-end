import { describe, expect, it } from 'vitest';
import { SHARED_BOX_CLASS } from '@/components/ui/forms/highlighted-input';
import { fieldClass, fieldStyle } from './field-tiers';

describe('fieldClass', () => {
    it('floors every tier at the 24px AA minimum', () => {
        for (const tier of ['task', 'compact', 'settings'] as const) {
            // Anchored so this can't match inside `pointer-coarse:min-h-[...]`,
            // which would otherwise let the coarse-pointer token satisfy the
            // plain-pointer assertion vacuously.
            const m = fieldClass(tier).match(/(?:^|\s)min-h-\[(\d+)px\]/);
            expect(m, `${tier} declares no min-h`).not.toBeNull();
            expect(Number(m![1])).toBeGreaterThanOrEqual(24);
        }
    });

    it('floors every tier at 44px on a coarse pointer', () => {
        for (const tier of ['task', 'compact', 'settings'] as const) {
            const m = fieldClass(tier).match(/pointer-coarse:min-h-\[(\d+)px\]/);
            expect(m, `${tier} declares no coarse min-h`).not.toBeNull();
            expect(Number(m![1])).toBeGreaterThanOrEqual(44);
        }
    });

    it('keeps compact free of w-full so dense inline rows keep their width', () => {
        // A w-full compact tier would either break those rows or start a
        // width-class fight that attribute order does not win, because the
        // generated stylesheet's order decides which of w-full/w-auto applies.
        expect(fieldClass('compact')).not.toContain('w-full');
        expect(fieldClass('task')).toContain('w-full');
    });

    it('keeps the task and Settings tiers visually distinct', () => {
        // input-styles.ts documents these as deliberately different tiers.
        // Unifying them is out of scope; this test is what keeps that true.
        expect(fieldClass('task')).not.toEqual(fieldClass('settings'));
        expect(fieldClass('task')).toContain('font-mono');
        expect(fieldClass('settings')).toContain('font-display');
    });

    it('carries the surface tokens of each tier', () => {
        expect(fieldStyle('task')).toMatchObject({
            backgroundColor: 'var(--surface-input-bg)'
        });
        expect(fieldStyle('settings')).toMatchObject({
            backgroundColor: 'rgba(255,255,255,.04)'
        });
    });

    it('keeps the quick-add overlay box in sync with the task tier', () => {
        // highlighted-input.tsx hand-mirrors the task tier's padding and
        // border so its highlight overlay lines up under the real input; this
        // pins the two together so a tier change can't silently misalign it.
        const taskTokens = fieldClass('task').split(/\s+/);
        const overlayTokens = SHARED_BOX_CLASS.split(/\s+/);

        const paddingTokens = (tokens: string[]) =>
            tokens.filter((token) => /^p[xy]-[\d.]+$/.test(token)).sort();

        expect(paddingTokens(overlayTokens)).toEqual(paddingTokens(taskTokens));
        expect(overlayTokens).toContain('border');
        expect(taskTokens).toContain('border');
    });
});
