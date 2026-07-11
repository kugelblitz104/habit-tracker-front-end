import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

type SubtaskRowProps = {
    subtask: TaskRead;
    onToggle: () => void;
    disabled?: boolean;
    /**
     * 'checklist' — SubtaskSection's editable row: a `role=checkbox` toggle
     * button (so trailing actions stay independently clickable) in a `<li>`,
     * mono-styled title.
     * 'view' — TaskDetailBody's read-only row: the whole row is the toggle
     * button, display-font title, no trailing actions.
     */
    variant: 'checklist' | 'view';
    /** Checklist-only trailing actions (promote / delete). */
    actions?: ReactNode;
};

/**
 * Shared checkbox-row chrome for a subtask: a bordered square that fills in
 * and shows a check when done, plus the title (struck through + faint when
 * done). The two hosts wrap this differently — see `variant` — so both keep
 * their existing exact markup/behavior while sharing the checkbox/title bits.
 */
export const SubtaskRow = ({ subtask, onToggle, disabled, variant, actions }: SubtaskRowProps) => {
    const done = subtask.status === TaskStatus.DONE;

    if (variant === 'checklist') {
        return (
            <li
                className='flex items-center gap-2 border-b py-1.5'
                style={{ borderColor: 'var(--surface-input-border)' }}
            >
                <button
                    type='button'
                    role='checkbox'
                    aria-checked={done}
                    aria-label={
                        done ? `Mark "${subtask.title}" not done` : `Mark "${subtask.title}" done`
                    }
                    onClick={onToggle}
                    disabled={disabled}
                    className='flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors disabled:cursor-not-allowed'
                    style={{
                        borderColor: done
                            ? 'var(--color-status-done-check)'
                            : 'var(--surface-input-border)',
                        backgroundColor: done ? 'rgba(63, 107, 74, 0.35)' : 'transparent'
                    }}
                >
                    {done && (
                        <Check size={11} style={{ color: 'var(--color-status-done-check)' }} />
                    )}
                </button>
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
        <button
            type='button'
            onClick={onToggle}
            className='flex items-center gap-2 rounded-button px-1.5 py-1 text-left transition-colors hover:bg-white/5'
        >
            <span
                className='flex h-4 w-4 shrink-0 items-center justify-center rounded border'
                style={{
                    borderColor: done
                        ? 'var(--color-status-done-check)'
                        : 'var(--surface-input-border)',
                    backgroundColor: done ? 'rgba(63, 107, 74, 0.35)' : 'transparent'
                }}
            >
                {done && (
                    <Check
                        size={11}
                        strokeWidth={3}
                        style={{ color: 'var(--color-status-done-check)' }}
                    />
                )}
            </span>
            <span
                className={`font-display text-[13px] ${
                    done ? 'text-text-faint line-through' : 'text-text-secondary'
                }`}
            >
                {subtask.title}
            </span>
        </button>
    );
};
