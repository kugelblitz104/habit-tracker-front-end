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

const pad2 = (n: number) => String(n).padStart(2, '0');

const toISODate = (d: Date): string =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Weekday names + common abbreviations → 0(Sun)–6(Sat).
const WEEKDAY_INDEX: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tues: 2, tuesday: 2,
    wed: 3, weds: 3, wednesday: 3,
    thu: 4, thur: 4, thurs: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6
};

/**
 * Parse a *relative* date token into YYYY-MM-DD, or null when it isn't one.
 * Accepts `today`/`tod`, `tom`/`tomorrow`, `+Nd` (N days out) and weekday
 * names/abbreviations (`fri`, `friday`). Weekdays always resolve to the next
 * such day in the future — a token matching today's weekday means next week.
 * Resolved against `now` so "today" tracks the wall clock.
 */
const parseRelativeDate = (raw: string, now: Date): string | null => {
    const key = raw.toLowerCase();
    // Midnight-anchored copy so day arithmetic can't be skewed by the time.
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (key === 'today' || key === 'tod') return toISODate(base);
    if (key === 'tomorrow' || key === 'tom') {
        base.setDate(base.getDate() + 1);
        return toISODate(base);
    }
    const rel = /^\+(\d+)d$/.exec(key);
    if (rel) {
        base.setDate(base.getDate() + Number(rel[1]));
        return toISODate(base);
    }
    if (key in WEEKDAY_INDEX) {
        const delta = ((WEEKDAY_INDEX[key]! - base.getDay() + 7) % 7) || 7;
        base.setDate(base.getDate() + delta);
        return toISODate(base);
    }
    return null;
};

/**
 * Parse a flexible short date into YYYY-MM-DD, or null if it doesn't look like a
 * date. Accepts `M-D`, `M/D`, `M-D-YY`, `M-D-YYYY` (and `/` variants). A missing
 * year defaults to `fallbackYear`; a two-digit year maps to 2000+YY.
 */
const parseFlexibleDate = (raw: string, fallbackYear: number): string | null => {
    const parts = raw.split(/[-/]/);
    if (parts.length < 2 || parts.length > 3) return null;
    if (parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;

    const month = Number(parts[0]);
    const day = Number(parts[1]);
    let year = fallbackYear;
    if (parts.length === 3) {
        const y = Number(parts[2]);
        year = y < 100 ? 2000 + y : y;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    // Reject impossible day-of-month (e.g. 2-30) via a round-trip check.
    const probe = new Date(year, month - 1, day);
    if (probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;

    return `${year}-${pad2(month)}-${pad2(day)}`;
};

type Classified = { type: TaskTokenType; value: number | string } | null;

const classifyWord = (word: string, now: Date): Classified => {
    const marker = word[0];
    const body = word.slice(1);
    // A date token accepts either a relative form (today/tom/fri/+3d) or a
    // flexible numeric date; relative is tried first since the two never overlap.
    const asDate = (): string | null =>
        parseRelativeDate(body, now) ?? parseFlexibleDate(body, now.getFullYear());
    switch (marker) {
        case '!': {
            const key = body.toLowerCase();
            if (key in PRIORITY_WORDS) return { type: 'priority', value: PRIORITY_WORDS[key]! };
            return null;
        }
        case '*': {
            const date = asDate();
            return date ? { type: 'scheduled', value: date } : null;
        }
        case '>': {
            const date = asDate();
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
