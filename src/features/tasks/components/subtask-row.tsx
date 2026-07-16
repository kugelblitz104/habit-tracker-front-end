import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import type { DraggableAttributes } from '@dnd-kit/core';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { StatusControl } from './status-control';

type SubtaskRowProps = {
    subtask: TaskRead;
    /** Change the subtask's status (the round glyph opens the 8-status picker). */
    onStatusChange: (status: TaskStatus) => void;
    /** Commit a new title. When provided, the title becomes click-to-edit. */
    onRename?: (title: string) => void;
    disabled?: boolean;
    /**
     * 'checklist' — SubtaskSection's editable row: a `<li>` with a leading drag
     * handle, the status glyph, a mono title and trailing actions.
     * 'view' — TaskDetailBody's read-only row: status glyph + display-font
     * title, optional trailing actions, no drag handle.
     */
    variant: 'checklist' | 'view';
    /** Trailing actions (rename / move / promote / delete). */
    actions?: ReactNode;
    /** Checklist-only leading drag handle (dnd-kit grip). */
    handle?: ReactNode;
    /** Checklist-only sortable wiring for the `<li>`. */
    setNodeRef?: (node: HTMLElement | null) => void;
    style?: CSSProperties;
    attributes?: DraggableAttributes;
    isDragging?: boolean;
};

/**
 * Shared row chrome for a subtask: the same round status glyph parent tasks use
 * (click to open the 8-status picker) plus the title (struck through + faint
 * when done or cancelled). When `onRename` is supplied the title is
 * click-to-edit inline. Subtasks surface *only* their status — other metadata
 * (priority, notes, …) stays hidden unless the task is promoted to a full task.
 * The two hosts wrap this differently via `variant`.
 */
export const SubtaskRow = ({
    subtask,
    onStatusChange,
    onRename,
    disabled,
    variant,
    actions,
    handle,
    setNodeRef,
    style,
    attributes,
    isDragging
}: SubtaskRowProps) => {
    const status = (subtask.status ?? TaskStatus.OPEN) as TaskStatus;
    // Done and cancelled both read as "settled" — struck through + faint, and
    // (via sortSubtasks) sunk to the bottom of the list.
    const struck = status === TaskStatus.DONE || status === TaskStatus.CANCELLED;

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(subtask.title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    const startEdit = () => {
        if (!onRename) return;
        setDraft(subtask.title);
        setEditing(true);
    };
    const commit = () => {
        if (!editing) return;
        setEditing(false);
        const next = draft.trim();
        if (next && next !== subtask.title) onRename?.(next);
    };
    const cancel = () => {
        setEditing(false);
        setDraft(subtask.title);
    };
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Keep Enter/Escape from bubbling to the host pane/editor.
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
        }
    };

    if (variant === 'checklist') {
        return (
            <li
                ref={setNodeRef}
                className='flex items-center gap-2 border-b py-1.5'
                style={{
                    ...style,
                    borderColor: 'var(--surface-input-border)',
                    opacity: isDragging ? 0.5 : 1
                }}
                {...attributes}
            >
                {handle}
                <StatusControl
                    status={status}
                    onSelect={onStatusChange}
                    band='whenever'
                    disabled={disabled}
                />
                {editing ? (
                    <input
                        ref={inputRef}
                        type='text'
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commit}
                        aria-label='Rename subtask'
                        className='min-w-0 flex-1 rounded-[4px] border bg-transparent px-1 py-0.5 font-mono text-[12px] text-text-primary outline-none'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    />
                ) : (
                    <button
                        type='button'
                        onClick={startEdit}
                        disabled={!onRename}
                        title={onRename ? `Rename "${subtask.title}"` : subtask.title}
                        className={`min-w-0 flex-1 truncate text-left font-mono text-[12px] ${
                            struck ? 'text-text-faint line-through' : 'text-text-secondary'
                        } ${onRename ? 'cursor-text hover:text-text-primary' : 'cursor-default'}`}
                    >
                        {subtask.title}
                    </button>
                )}
                {actions}
            </li>
        );
    }

    return (
        <div className='flex items-center gap-2 rounded-button px-1.5 py-1'>
            <StatusControl status={status} onSelect={onStatusChange} band='whenever' />
            {editing ? (
                <input
                    ref={inputRef}
                    type='text'
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={commit}
                    aria-label='Rename subtask'
                    className='min-w-0 flex-1 rounded-[4px] border bg-transparent px-1 py-0.5 font-display text-[13px] text-text-primary outline-none'
                    style={{ borderColor: 'var(--surface-input-border)' }}
                />
            ) : (
                <button
                    type='button'
                    onClick={startEdit}
                    disabled={!onRename}
                    title={onRename ? `Rename "${subtask.title}"` : subtask.title}
                    className={`min-w-0 flex-1 truncate text-left font-display text-[13px] ${
                        struck ? 'text-text-faint line-through' : 'text-text-secondary'
                    } ${onRename ? 'cursor-text hover:text-text-primary' : 'cursor-default'}`}
                >
                    {subtask.title}
                </button>
            )}
            {actions}
        </div>
    );
};
