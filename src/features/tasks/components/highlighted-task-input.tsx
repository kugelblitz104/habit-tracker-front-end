import { useRef, type KeyboardEvent, type Ref } from 'react';
import { Input } from '@/components/ui/forms/input';
import type { TaskInputSegment, TaskTokenType } from '../utils/parse-task-input';

/**
 * Single-line text input that renders recognized quick-add tokens in accent
 * colors. The technique: a color overlay sits behind a transparent-text input
 * (caret still visible); both share identical typography so the styled glyphs
 * line up exactly under what the user types. Horizontal scroll is mirrored so
 * long input stays aligned. The parsing lives in the parent (it also needs the
 * extracted fields); this component just paints the segments it's handed.
 */

const TOKEN_COLOR: Record<TaskTokenType, string> = {
    priority: 'var(--color-now-accent)',
    scheduled: 'var(--color-status-scheduled)',
    due: 'var(--color-status-duetoday)',
    project: 'var(--color-status-needsinfo)',
    estimate: 'var(--color-soon-label)',
    notes: 'var(--color-text-muted)'
};

// Shared with the input so the overlay glyphs sit exactly under the real text.
const SHARED_TEXT_CLASS = 'font-display text-[14px] leading-normal tracking-normal';

// Shared with the input's `task` tier (border + px-2.5/py-1.5) so the overlay's
// content box has the same left offset as the real input's; a tier change here
// needs the same change in the overlay's className below. Pinned against
// `fieldClass('task')` by field-tiers.test.ts.
export const SHARED_BOX_CLASS = 'border border-transparent px-2.5 py-1.5';

type HighlightedTaskInputProps = {
    value: string;
    segments: TaskInputSegment[];
    onChange: (value: string) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
    /**
     * Fired whenever the caret/selection position changes (typing, arrow
     * keys, click) so a parent can do caret-relative work — e.g. detecting an
     * in-progress `@project` token for autocomplete. Reports `selectionStart`.
     */
    onCaretChange?: (position: number) => void;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    ariaLabel?: string;
    inputRef?: Ref<HTMLInputElement>;
    className?: string;
};

export const HighlightedTaskInput = ({
    value,
    segments,
    onChange,
    onKeyDown,
    onCaretChange,
    placeholder,
    disabled = false,
    autoFocus = false,
    ariaLabel,
    inputRef,
    className
}: HighlightedTaskInputProps) => {
    const overlayRef = useRef<HTMLDivElement>(null);

    // Keep the overlay's horizontal scroll in lock-step with the input's so
    // tokens stay aligned once the text overflows the visible width.
    const syncScroll = (el: HTMLInputElement) => {
        if (overlayRef.current) overlayRef.current.scrollLeft = el.scrollLeft;
    };

    return (
        <div className={`relative min-w-0 flex-1 ${className ?? ''}`}>
            <div
                ref={overlayRef}
                aria-hidden='true'
                className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre ${SHARED_BOX_CLASS} ${SHARED_TEXT_CLASS}`}
            >
                {value.length === 0 ? (
                    <span className='text-text-faint'>{placeholder}</span>
                ) : (
                    segments.map((segment, index) => (
                        <span
                            key={index}
                            style={
                                segment.type === 'text'
                                    ? { color: 'var(--color-text-primary)' }
                                    : { color: TOKEN_COLOR[segment.type], fontWeight: 600 }
                            }
                        >
                            {segment.text}
                        </span>
                    ))
                )}
            </div>
            {/* `style` (not className) forces color/background/border/font here: it's
                the only thing guaranteed to beat the task tier's own classes and its
                inline background/border colors, which className ordering can't. */}
            <Input
                ref={inputRef}
                tier='task'
                type='text'
                value={value}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-label={ariaLabel}
                onChange={(e) => {
                    onChange(e.target.value);
                    syncScroll(e.target);
                    onCaretChange?.(e.target.selectionStart ?? e.target.value.length);
                }}
                onKeyDown={onKeyDown}
                onSelect={(e) =>
                    onCaretChange?.(e.currentTarget.selectionStart ?? e.currentTarget.value.length)
                }
                onScroll={(e) => syncScroll(e.currentTarget)}
                placeholder={placeholder}
                className={`relative w-full bg-transparent whitespace-pre caret-text-primary ${SHARED_TEXT_CLASS}`}
                style={{
                    caretColor: 'var(--color-text-primary)',
                    color: 'transparent',
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px'
                }}
            />
        </div>
    );
};
