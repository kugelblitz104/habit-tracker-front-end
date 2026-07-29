import { describe, expect, it } from 'vitest';

import { slugify } from './download';

/**
 * `downloadBlob`/`downloadText` are DOM-only and left to the e2e suite;
 * `slugify` is pure and covered here.
 */

describe('slugify', () => {
    it('lowercases and dashes a normal name', () => {
        expect(slugify('My Project!', 'tasks')).toBe('my-project');
        expect(slugify('All tasks', 'tasks')).toBe('all-tasks');
    });

    it('collapses runs of punctuation and whitespace into a single dash', () => {
        expect(slugify('Q1 -- planning   &   review', 'tasks')).toBe('q1-planning-review');
        expect(slugify('a_b.c/d', 'tasks')).toBe('a-b-c-d');
    });

    it('trims leading and trailing dashes', () => {
        expect(slugify('  spaced  ', 'tasks')).toBe('spaced');
        expect(slugify('---edge---', 'tasks')).toBe('edge');
    });

    it('keeps digits', () => {
        expect(slugify('2026 Q1', 'tasks')).toBe('2026-q1');
    });

    it('falls back to the given fallback when nothing survives', () => {
        expect(slugify('', 'tasks')).toBe('tasks');
        expect(slugify('!!!', 'tasks')).toBe('tasks');
        expect(slugify('   ', 'tasks')).toBe('tasks');
        expect(slugify('!!!', 'profile')).toBe('profile');
    });

    it('drops non-ASCII letters rather than transliterating them', () => {
        // `[^a-z0-9]` is ASCII-only, so accents become separators, not letters.
        expect(slugify('Ünïcode', 'tasks')).toBe('n-code');
        expect(slugify('日本語', 'tasks')).toBe('tasks');
    });
});
