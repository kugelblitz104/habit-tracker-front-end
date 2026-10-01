import type { HighlightSegment } from '@/components/ui/forms/highlighted-input';
import { POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { HelpCircle, X } from 'lucide-react';

/**
 * The parts the task and countdown quick-capture bars share: the token pills,
 * the `?` cheatsheet, and the two pure helpers behind them. The scanning loops
 * of the two parsers stay separate on purpose (see ROADMAP Low priority).
 */

const isWhitespace = (segment?: HighlightSegment) =>
    !!segment && segment.type === 'text' && /^\s+$/.test(segment.text);

/**
 * The raw input with the first token of `type` removed, plus one adjacent
 * whitespace run so no double space is left. Null when no such token exists.
 * Relies on both parsers emitting whitespace runs as their own `'text'` segments.
 */
export const removeSegmentToken = (segments: HighlightSegment[], type: string): string | null => {
    const idx = segments.findIndex((s) => s.type === type);
    if (idx === -1) return null;
    let start = idx;
    let count = 1;
    if (isWhitespace(segments[idx + 1])) {
        count = 2; // token + trailing space
    } else if (isWhitespace(segments[idx - 1])) {
        start = idx - 1; // leading space + token
        count = 2;
    }
    const rest = [...segments];
    rest.splice(start, count);
    return rest
        .map((s) => s.text)
        .join('')
        .replace(/^\s+/, '');
};

/**
 * The id of the item an `@name` token means: an exact case-insensitive match,
 * else a unique prefix match (so "@mark" finds "Marketing"), else null.
 */
export const matchByName = (items: { id: number; name: string }[], name: string): number | null => {
    const lower = name.toLowerCase();
    const exact = items.find((item) => item.name.toLowerCase() === lower);
    if (exact) return exact.id;
    const prefix = items.filter((item) => item.name.toLowerCase().startsWith(lower));
    return prefix.length === 1 ? prefix[0]!.id : null;
};

export type TokenPill<T extends string> = { type: T; label: string };

/**
 * Removable pills for the tokens parsed so far. The pill's own height IS the
 * X's height, so a floor on the X sets the chip: a coarse 44px one made these
 * 46px-tall slabs. The X keeps a 24px box (SC 2.5.8 AA) and takes no coarse
 * bump. hit-target is NOT the alternative: this row wraps at gap-1.5, so 44px
 * overlays overlap the row above as well as the pill beside them, and a tap
 * then clears the wrong token.
 */
export const TokenPillRow = <T extends string>({
    pills,
    onRemove
}: {
    pills: TokenPill<T>[];
    onRemove: (type: T) => void;
}) =>
    pills.length > 0 ? (
        <div className='mt-2 flex flex-wrap items-center gap-1.5'>
            {pills.map((pill) => (
                <span
                    key={pill.type}
                    className='inline-flex min-h-[24px] items-center gap-1 rounded-chip border pl-2 pr-1 font-mono text-[10.5px] text-text-secondary'
                    style={{
                        backgroundColor: 'var(--surface-input-bg)',
                        borderColor: 'var(--surface-input-border)'
                    }}
                >
                    {pill.label}
                    <button
                        type='button'
                        onClick={() => onRemove(pill.type)}
                        aria-label={`Remove ${pill.label}`}
                        data-target-exempt='inline'
                        className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-faint transition-colors hover:text-text-primary'
                    >
                        <X size={11} />
                    </button>
                </span>
            ))}
        </div>
    ) : null;

/** The `?` popover listing a bar's quick-add tokens. */
export const TokenCheatsheetPopover = ({ rows }: { rows: { token: string; label: string }[] }) => (
    <Popover className='relative shrink-0'>
        <PopoverButton
            className='inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full p-0.5 text-text-faint outline-none transition-colors pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] hover:text-text-secondary focus-visible:ring-1 focus-visible:ring-now-accent'
            aria-label='Quick-add token help'
            title='Quick-add tokens'
        >
            <HelpCircle size={15} />
        </PopoverButton>
        <PopoverPanel
            anchor='bottom end'
            className={`${POPOVER_PANEL_CLASS} mt-1 w-72`}
            style={popoverPanelStyle}
        >
            <div className='flex flex-col gap-1.5 p-1'>
                <p className='px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint'>
                    Quick-add tokens
                </p>
                {rows.map((row) => (
                    <div key={row.token} className='flex items-baseline gap-2 px-1'>
                        <code
                            className='shrink-0 rounded-[4px] px-1.5 py-0.5 font-mono text-[11px] text-text-secondary'
                            style={{ backgroundColor: 'rgba(255,255,255,.06)' }}
                        >
                            {row.token}
                        </code>
                        <span className='font-display text-[12px] text-text-muted'>
                            {row.label}
                        </span>
                    </div>
                ))}
                <p className='px-1 pt-1 font-mono text-[10px] leading-relaxed text-text-faint'>
                    Dates also take today, tom, weekday names (fri), +3d.
                </p>
            </div>
        </PopoverPanel>
    </Popover>
);
