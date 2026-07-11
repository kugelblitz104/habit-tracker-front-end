import { useRef, type KeyboardEvent, type Ref } from 'react';
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

type HighlightedTaskInputProps = {
    value: string;
    segments: TaskInputSegment[];
    onChange: (value: string) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
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
                className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre ${SHARED_TEXT_CLASS}`}
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
            <input
                ref={inputRef}
                type='text'
                value={value}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-label={ariaLabel}
                onChange={(e) => {
                    onChange(e.target.value);
                    syncScroll(e.target);
                }}
                onKeyDown={onKeyDown}
                onScroll={(e) => syncScroll(e.currentTarget)}
                placeholder={placeholder}
                className={`relative w-full bg-transparent whitespace-pre text-transparent caret-text-primary outline-none ${SHARED_TEXT_CLASS}`}
                style={{ caretColor: 'var(--color-text-primary)' }}
            />
        </div>
    );
};
