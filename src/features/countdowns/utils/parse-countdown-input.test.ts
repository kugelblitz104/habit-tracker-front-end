import { describe, expect, it } from 'vitest';
import { parseCountdownInput } from './parse-countdown-input';

// A Thursday.
const NOW = new Date(2026, 7, 20, 9, 0);

const joined = (raw: string) =>
    parseCountdownInput(raw, NOW)
        .segments.map((s) => s.text)
        .join('');

describe('parseCountdownInput', () => {
    it('returns the raw text as the title when there are no tokens', () => {
        const parsed = parseCountdownInput('Mortgage closing', NOW);
        expect(parsed.cleanTitle).toBe('Mortgage closing');
        expect(parsed.targetDate).toBeUndefined();
        expect(parsed.groupName).toBeUndefined();
        expect(parsed.hasTokens).toBe(false);
    });

    it('extracts a relative date token', () => {
        const parsed = parseCountdownInput('Standup >fri', NOW);
        expect(parsed.cleanTitle).toBe('Standup');
        expect(parsed.targetDate).toBe('2026-08-21');
        expect(parsed.hasTokens).toBe(true);
    });

    it('extracts a numeric date token', () => {
        expect(parseCountdownInput('Launch >12-25', NOW).targetDate).toBe('2026-12-25');
    });

    it('extracts a group token', () => {
        const parsed = parseCountdownInput('Launch @Work', NOW);
        expect(parsed.cleanTitle).toBe('Launch');
        expect(parsed.groupName).toBe('Work');
    });

    it('extracts a quoted group name with spaces', () => {
        const parsed = parseCountdownInput('Launch @"Side projects" >tom', NOW);
        expect(parsed.cleanTitle).toBe('Launch');
        expect(parsed.groupName).toBe('Side projects');
        expect(parsed.targetDate).toBe('2026-08-21');
    });

    it('accepts single quotes for the quoted form', () => {
        expect(parseCountdownInput("Launch @'Side projects'", NOW).groupName).toBe('Side projects');
    });

    it('treats an unclosed quote as the group while it is being typed', () => {
        expect(parseCountdownInput('Launch @"Side pro', NOW).groupName).toBe('Side pro');
    });

    it('takes the tokens in any order and anywhere in the line', () => {
        const parsed = parseCountdownInput('>fri Ship @Work the deck', NOW);
        expect(parsed.cleanTitle).toBe('Ship the deck');
        expect(parsed.targetDate).toBe('2026-08-21');
        expect(parsed.groupName).toBe('Work');
    });

    it('leaves a word alone when its body is not a valid date', () => {
        const parsed = parseCountdownInput('Compare >prices', NOW);
        expect(parsed.cleanTitle).toBe('Compare >prices');
        expect(parsed.targetDate).toBeUndefined();
        expect(parsed.hasTokens).toBe(false);
    });

    it('does not mistake hyphenated words for tokens', () => {
        expect(parseCountdownInput('2-for-1 well-being day', NOW).cleanTitle).toBe(
            '2-for-1 well-being day'
        );
    });

    it('treats a leading dash as title text, not a notes token', () => {
        const parsed = parseCountdownInput('-buy milk', NOW);
        expect(parsed.cleanTitle).toBe('-buy milk');
        expect(parsed.hasTokens).toBe(false);
        expect(parseCountdownInput('Trip -planning notes', NOW).cleanTitle).toBe(
            'Trip -planning notes'
        );
    });

    it('ignores a bare @ with no name', () => {
        const parsed = parseCountdownInput('Email @ noon', NOW);
        expect(parsed.groupName).toBeUndefined();
        expect(parsed.cleanTitle).toBe('Email @ noon');
    });

    it('keeps the last token when one is repeated', () => {
        expect(parseCountdownInput('Trip >fri >12-25', NOW).targetDate).toBe('2026-12-25');
    });

    it('emits segments that cover the whole raw string verbatim', () => {
        expect(joined('  Ship  >fri   @Work ')).toBe('  Ship  >fri   @Work ');
    });

    it('labels each segment with its token type', () => {
        const types = parseCountdownInput('Ship >fri @Work', NOW).segments.map((s) => s.type);
        expect(types).toEqual(['text', 'text', 'date', 'text', 'group']);
    });

    it('collapses whitespace in the clean title', () => {
        expect(parseCountdownInput('  Ship   the   deck  ', NOW).cleanTitle).toBe('Ship the deck');
    });

    it('keeps the last group when one is repeated', () => {
        expect(parseCountdownInput('Trip @Work @Home', NOW).groupName).toBe('Home');
    });

    it('ignores an empty quoted group name', () => {
        expect(parseCountdownInput('Trip @""', NOW).groupName).toBeUndefined();
        expect(parseCountdownInput("Trip @''", NOW).groupName).toBeUndefined();
    });

    it('leaves a marker abutting another marker as title text', () => {
        const parsed = parseCountdownInput('Trip >fri@Work', NOW);
        expect(parsed.targetDate).toBeUndefined();
        expect(parsed.groupName).toBeUndefined();
        expect(parsed.cleanTitle).toBe('Trip >fri@Work');
    });
});
