import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { CSSProperties, ReactNode } from 'react';
import { StatusControl } from './status-control';

type SubtaskRowProps = {
    subtask: TaskRead;
    /** Change the subtask's status (the round glyph opens the 8-status picker). */
    onStatusChange: (status: TaskStatus) => void;
    disabled?: boolean;
    /**
     * 'checklist' — SubtaskSection's editable row: a `<li>` with a leading drag
     * handle, the status glyph, a mono title and trailing actions.
     * 'view' — TaskDetailBody's read-only row: status glyph + display-font
     * title, no drag handle or trailing actions.
     */
    variant: 'checklist' | 'view';
    /** Checklist-only trailing actions (promote / delete). */
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
 * when done). Subtasks surface *only* their status — other metadata (priority,
 * notes, …) stays hidden unless the task is promoted to a full task. The two
 * hosts wrap this differently via `variant`.
 */
export const SubtaskRow = ({
    subtask,
    onStatusChange,
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
    const done = status === TaskStatus.DONE;

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
                <span
                    className={`min-w-0 flex-1 truncate font-mono text-[12px] ${
                        done ? 'text-text-faint line-through' : 'text-text-secondary'
                    }`}
                    title={subtask.title}
                >
                    {subtask.title}
                </span>
                {actions}
            </li>
        );
    }

    return (
        <div className='flex items-center gap-2 rounded-button px-1.5 py-1'>
            <StatusControl status={status} onSelect={onStatusChange} band='whenever' />
            <span
                className={`font-display text-[13px] ${
                    done ? 'text-text-faint line-through' : 'text-text-secondary'
                }`}
            >
                {subtask.title}
            </span>
        </div>
    );
};
