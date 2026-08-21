/**
 * Inline quick-add token parser for the task capture bar.
 *
 * Lets a task be captured in one line, e.g.
 *   `Ship the deck !high *8-16 >8-19 @Marketing ~90 -notes for the review`
 *
 * Tokens (each a whitespace-delimited word, except notes which runs to EOL):
 *   `!low` `!med`/`!medium` `!high` `!none`/`!` → priority (0–3)
 *   `*M-D`  → scheduled date  (M/D and M-D-YYYY / M-D-YY also accepted, plus
 *              the relative forms `today`, `tom`, weekday names, `+3d`)
 *   `>M-D`  → due date        (same date forms as scheduled)
 *   `@name` → project (matched by name elsewhere; no spaces)
 *   `~N`    → estimated effort in minutes
 *   `-…`    → notes (everything after the leading dash, to end of line)
 *
 * A word only counts as a token when its body is valid (a known priority word,
 * a parseable date, digits for the estimate, a non-empty project/notes body) —
 * otherwise it stays part of the title, so "well-being" or "1-on-1" aren't
 * mistaken for tokens. Returns both the extracted fields and an ordered list of
 * segments (covering the whole raw string) for inline highlighting.
 */

import { parseDateToken } from '@/lib/date-tokens';

export type TaskTokenType = 'priority' | 'scheduled' | 'due' | 'project' | 'estimate' | 'notes';

export type TaskInputSegment = {
    text: string;
    /** 'text' = ordinary title text (or whitespace); otherwise a recognized token. */
    type: TaskTokenType | 'text';
};

export type ParsedTaskInput = {
    /** Title with all recognized tokens removed and whitespace collapsed. */
    cleanTitle: string;
    /** 0–3 when a priority token was present. */
    priority?: number;
    /** YYYY-MM-DD when a valid scheduled date token was present. */
    scheduledDate?: string;
    dueDate?: string;
    projectName?: string;
    estimatedMinutes?: number;
    notes?: string;
    /** Ordered spans covering the whole raw input, for highlighted rendering. */
    segments: TaskInputSegment[];
    /** True when at least one token was recognized. */
    hasTokens: boolean;
};

const PRIORITY_WORDS: Record<string, number> = {
    '': 0,
    none: 0,
    low: 1,
    med: 2,
    medium: 2,
    high: 3
};

type Classified = { type: TaskTokenType; value: number | string } | null;

const classifyWord = (word: string, now: Date): Classified => {
    const marker = word[0];
    const body = word.slice(1);
    switch (marker) {
        case '!': {
            const key = body.toLowerCase();
            if (key in PRIORITY_WORDS) return { type: 'priority', value: PRIORITY_WORDS[key]! };
            return null;
        }
        case '*': {
            const date = parseDateToken(body, now);
            return date ? { type: 'scheduled', value: date } : null;
        }
        case '>': {
            const date = parseDateToken(body, now);
            return date ? { type: 'due', value: date } : null;
        }
        case '@':
            return body.length > 0 ? { type: 'project', value: body } : null;
        case '~':
            return /^\d+$/.test(body) ? { type: 'estimate', value: Number(body) } : null;
        default:
            return null;
    }
};

export const parseTaskInput = (raw: string, now: Date): ParsedTaskInput => {
    const segments: TaskInputSegment[] = [];
    const titleWords: string[] = [];
    const result: ParsedTaskInput = { cleanTitle: '', segments, hasTokens: false };

    let i = 0;
    while (i < raw.length) {
        const ch = raw[i]!;

        // Whitespace run — preserved verbatim so the highlight overlay aligns.
        if (/\s/.test(ch)) {
            let j = i;
            while (j < raw.length && /\s/.test(raw[j]!)) j++;
            segments.push({ text: raw.slice(i, j), type: 'text' });
            i = j;
            continue;
        }

        // Notes: a leading dash (at a word boundary) captures the rest of the line.
        if (ch === '-') {
            const rest = raw.slice(i);
            segments.push({ text: rest, type: 'notes' });
            const body = rest.slice(1).trim();
            if (body) {
                result.notes = body;
                result.hasTokens = true;
            }
            i = raw.length;
            break;
        }

        // Quoted project: @"multi word" (single quotes too) so project names with
        // spaces can be selected. Runs to the closing quote, or EOL while typing.
        if (ch === '@' && (raw[i + 1] === '"' || raw[i + 1] === "'")) {
            const quote = raw[i + 1]!;
            const closeIdx = raw.indexOf(quote, i + 2);
            const end = closeIdx === -1 ? raw.length : closeIdx + 1;
            const token = raw.slice(i, end);
            const name = raw.slice(i + 2, closeIdx === -1 ? raw.length : closeIdx).trim();
            if (name) {
                segments.push({ text: token, type: 'project' });
                result.projectName = name;
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
                case 'priority':
                    result.priority = classified.value as number;
                    break;
                case 'scheduled':
                    result.scheduledDate = classified.value as string;
                    break;
                case 'due':
                    result.dueDate = classified.value as string;
                    break;
                case 'project':
                    result.projectName = classified.value as string;
                    break;
                case 'estimate':
                    result.estimatedMinutes = classified.value as number;
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
