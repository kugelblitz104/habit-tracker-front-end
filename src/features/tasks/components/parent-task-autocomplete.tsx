import { MENU_ITEM_CLASS, POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { formFieldClass, formFieldStyle } from './task-form-fields';

export type ParentTaskOption = { id: number; title: string };

type ParentTaskAutocompleteProps = {
    /** Current parent task id, or null for a top-level task. */
    value: number | null;
    onChange: (value: number | null) => void;
    /** Candidate parents (the profile's other top-level tasks). */
    options: ParentTaskOption[];
    id?: string;
};

const NONE_LABEL = 'None (top-level task)';

/** A synthetic first row that detaches the task (parent_id → null). */
type Item = { id: number | null; title: string };

/**
 * Type-to-filter parent-task picker, mirroring the `@project` autocomplete in
 * the capture bar: a text input plus a dropdown of matching tasks, selectable
 * by mouse or keyboard (↑/↓ + Enter, Esc to dismiss). A leading "None" row
 * detaches the task to top-level. Unlike the capture bar there's no `@` trigger
 * — this is a dedicated field, so typing filters directly.
 */
export const ParentTaskAutocomplete = ({
    value,
    onChange,
    options,
    id
}: ParentTaskAutocompleteProps) => {
    const selectedTitle = value == null ? '' : options.find((o) => o.id === value)?.title ?? '';
    const [text, setText] = useState(selectedTitle);
    const [open, setOpen] = useState(false);
    const [typing, setTyping] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reflect external value changes (and settle back after a pick/blur) into
    // the input whenever the user isn't actively typing.
    useEffect(() => {
        if (!typing) setText(selectedTitle);
    }, [selectedTitle, typing]);

    const items: Item[] = useMemo(() => {
        const query = text.trim().toLowerCase();
        // Show the full list until the user narrows it: empty text, or text
        // still equal to the current selection (i.e. just focused, not typed).
        const showAll = !typing || query === '' || query === selectedTitle.toLowerCase();
        const filtered = showAll
            ? options
            : options.filter((o) => o.title.toLowerCase().includes(query));
        return [{ id: null, title: NONE_LABEL }, ...filtered];
    }, [text, typing, options, selectedTitle]);

    // Reset the highlight whenever the candidate set changes.
    useEffect(() => setHighlightedIndex(0), [text, open]);

    const choose = (item: Item) => {
        onChange(item.id);
        setTyping(false);
        setText(item.id == null ? '' : item.title);
        setOpen(false);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!open || items.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setHighlightedIndex((i) => (i + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setHighlightedIndex((i) => (i - 1 + items.length) % items.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const chosen = items[highlightedIndex] ?? items[0];
            if (chosen) choose(chosen);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setTyping(false);
            setOpen(false);
        }
    };

    return (
        <div className='relative'>
            <input
                ref={inputRef}
                id={id}
                type='text'
                role='combobox'
                aria-expanded={open}
                aria-autocomplete='list'
                autoComplete='off'
                value={text}
                placeholder={NONE_LABEL}
                onFocus={() => {
                    setOpen(true);
                    setTyping(true);
                }}
                onBlur={() => {
                    // Real blur (not an item click — those preventDefault the
                    // mousedown so the input keeps focus): settle back to the
                    // current selection.
                    setOpen(false);
                    setTyping(false);
                }}
                onChange={(e) => {
                    setText(e.target.value);
                    setTyping(true);
                    setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                className={`${formFieldClass} placeholder:text-text-faint`}
                style={formFieldStyle}
            />
            {open && items.length > 0 && (
                <div
                    role='listbox'
                    aria-label='Matching tasks'
                    className={`absolute left-0 top-full z-10 mt-1 max-h-60 w-full overflow-auto ${POPOVER_PANEL_CLASS}`}
                    style={popoverPanelStyle}
                >
                    {items.map((item, index) => (
                        <button
                            key={item.id ?? 'none'}
                            type='button'
                            role='option'
                            aria-selected={index === highlightedIndex}
                            // Keep the input focused so this click's onClick fires
                            // before onBlur closes the dropdown.
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onClick={() => choose(item)}
                            className={`${MENU_ITEM_CLASS} ${
                                index === highlightedIndex ? 'bg-white/5' : ''
                            } ${item.id == null ? 'text-text-faint' : ''}`}
                        >
                            <span className='truncate'>{item.title}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
