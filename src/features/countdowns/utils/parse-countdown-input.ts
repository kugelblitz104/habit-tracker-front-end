/**
 * Inline quick-add token parser for the countdown capture bar.
 *
 * Lets a countdown be captured in one line, e.g.
 *   `Mortgage closing >12-25 @"Side projects"`
 *
 * Tokens (each a whitespace-delimited word):
 *   `>M-D`  → target date (also today/tom/weekday names/+3d, see date-tokens)
 *   `@name` → group; `@"two words"` for names with spaces
 *
 * A word only counts as a token when its body is valid, so `2-for-1` and
 * `well-being` stay part of the title. Returns both the extracted fields and an
 * ordered list of segments covering the whole raw string, for highlighting.
 */

import { parseDateToken } from '@/lib/date-tokens';

export type CountdownTokenType = 'date' | 'group';

export type CountdownInputSegment = {
    text: string;
    /** 'text' = ordinary title text (or whitespace); otherwise a recognized token. */
    type: CountdownTokenType | 'text';
};

export type ParsedCountdownInput = {
    cleanTitle: string;
    /** YYYY-MM-DD when a valid `>` token was present. */
    targetDate?: string;
    groupName?: string;
    segments: CountdownInputSegment[];
    hasTokens: boolean;
};

type Classified = { type: CountdownTokenType; value: string } | null;

const classifyWord = (word: string, now: Date): Classified => {
    const marker = word[0];
    const body = word.slice(1);
    switch (marker) {
        case '>': {
            const date = parseDateToken(body, now);
            return date ? { type: 'date', value: date } : null;
        }
        case '@':
            return body.length > 0 ? { type: 'group', value: body } : null;
        default:
            return null;
    }
};

export const parseCountdownInput = (raw: string, now: Date): ParsedCountdownInput => {
    const segments: CountdownInputSegment[] = [];
    const titleWords: string[] = [];
    const result: ParsedCountdownInput = { cleanTitle: '', segments, hasTokens: false };

    let i = 0;
    while (i < raw.length) {
        const ch = raw[i]!;

        // Whitespace run, preserved verbatim so the highlight overlay aligns.
        if (/\s/.test(ch)) {
            let j = i;
            while (j < raw.length && /\s/.test(raw[j]!)) j++;
            segments.push({ text: raw.slice(i, j), type: 'text' });
            i = j;
            continue;
        }

        // Quoted group: @"multi word" (single quotes too) so group names with
        // spaces can be selected. Runs to the closing quote, or EOL while typing.
        if (ch === '@' && (raw[i + 1] === '"' || raw[i + 1] === "'")) {
            const quote = raw[i + 1]!;
            const closeIdx = raw.indexOf(quote, i + 2);
            const end = closeIdx === -1 ? raw.length : closeIdx + 1;
            const token = raw.slice(i, end);
            const name = raw.slice(i + 2, closeIdx === -1 ? raw.length : closeIdx).trim();
            if (name) {
                segments.push({ text: token, type: 'group' });
                result.groupName = name;
                result.hasTokens = true;
            } else {
                segments.push({ text: token, type: 'text' });
            }
            i = end;
            continue;
        }

        // Otherwise a word: token if its body is valid, else plain title text.
        let j = i;
        while (j < raw.length && !/\s/.test(raw[j]!)) j++;
        const word = raw.slice(i, j);
        const classified = classifyWord(word, now);
        if (classified) {
            segments.push({ text: word, type: classified.type });
            result.hasTokens = true;
            switch (classified.type) {
                case 'date':
                    result.targetDate = classified.value;
                    break;
                case 'group':
                    result.groupName = classified.value;
                    break;
            }
        } else {
            segments.push({ text: word, type: 'text' });
            titleWords.push(word);
        }
        i = j;
    }

    result.cleanTitle = titleWords.join(' ').replace(/\s+/g, ' ').trim();
    return result;
};
