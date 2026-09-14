import { describe, expect, it } from 'vitest';
import { resolveDetailOrigin } from './detail-origin';

describe('resolveDetailOrigin', () => {
    it('returns to the page the detail was opened from', () => {
        expect(resolveDetailOrigin('/countdown', '/')).toMatchObject({
            backTo: '/countdown',
            backLabel: 'Countdown'
        });
    });

    it('keeps the search string, so the journal comes back to the same day', () => {
        expect(resolveDetailOrigin('/journal?date=2026-09-12', '/')).toMatchObject({
            backTo: '/journal?date=2026-09-12',
            backLabel: 'Journal'
        });
    });

    it('falls back to the parent list when nothing was stashed', () => {
        expect(resolveDetailOrigin(undefined, '/habits')).toMatchObject({
            backTo: '/habits',
            backLabel: 'Habits'
        });
    });

    it('says Back for a path with no tab of its own', () => {
        expect(resolveDetailOrigin('/projects/12', '/')).toEqual({
            backTo: '/projects/12',
            backLabel: 'Back',
            ariaLabel: 'Back'
        });
    });

    it('names the tab rather than overriding the accessible name', () => {
        expect(resolveDetailOrigin('/', '/habits').ariaLabel).toBeUndefined();
    });

    it.each(['https://evil.example/x', '//evil.example/x', 'javascript:alert(1)', 42, null])(
        'refuses %p as an origin',
        (from) => {
            expect(resolveDetailOrigin(from, '/tasks').backTo).toBe('/tasks');
        }
    );
});
