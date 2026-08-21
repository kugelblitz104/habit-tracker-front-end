import { Input } from '@/components/ui/forms/input';
import { Plus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

type CaptureBarProps = {
    /** Create a task from the typed title. Resolve clears the field; reject keeps it. */
    onCapture: (title: string) => Promise<void>;
    /**
     * Shift+Enter (or the leading + button) hands the typed text off to an
     * expanded details form, and the trailing hint advertises it.
     */
    onExpand?: (draftTitle: string) => void;
    disabled?: boolean;
    isPending?: boolean;
    /** Override the input placeholder (defaults to the task capture copy). */
    placeholder?: string;
};

/**
 * Full-width quick-capture input: leading +, README placeholder, trailing
 * keyboard hint. Enter creates a task and clears the field only once the
 * create succeeds; on failure the typed text is preserved for a retry.
 * With `onExpand`, Shift+Enter opens the expanded details form instead.
 */
export const CaptureBar = ({
    onCapture,
    onExpand,
    disabled = false,
    isPending = false,
    placeholder = 'Add a task'
}: CaptureBarProps) => {
    const [value, setValue] = useState('');

    const submit = async () => {
        const title = value.trim();
        if (!title || disabled || isPending) return;
        try {
            await onCapture(title);
            setValue('');
        } catch {
            // Keep the typed text so the user can retry; today.tsx shows the toast.
        }
    };

    const expand = () => {
        if (!onExpand || disabled || isPending) return;
        onExpand(value.trim());
        setValue('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (e.shiftKey && onExpand) {
            expand();
            return;
        }
        submit();
    };

    return (
        <div
            className='mb-[30px] flex items-center gap-2 rounded-button border px-3 py-2.5'
            style={{
                backgroundColor: 'var(--surface-input-bg)',
                borderColor: 'var(--surface-input-border)',
                opacity: disabled ? 0.5 : 1
            }}
        >
            {onExpand ? (
                <button
                    type='button'
                    onClick={expand}
                    disabled={disabled || isPending}
                    aria-label='Add details'
                    title='Add details'
                    className='inline-flex min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full p-0.5 text-text-muted transition-colors pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] hover:text-text-primary disabled:cursor-not-allowed'
                >
                    <Plus size={18} />
                </button>
            ) : (
                <Plus size={18} className='shrink-0 text-text-muted' />
            )}
            <Input
                type='text'
                value={value}
                disabled={disabled || isPending}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                aria-label={placeholder}
                className='min-w-0 flex-1 bg-transparent'
                style={{
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)'
                }}
            />
            {onExpand ? (
                <span className='flex shrink-0 items-center gap-2 font-mono text-[10px] text-text-faint'>
                    <span>↵ add</span>
                    <span>⇧↵ details</span>
                </span>
            ) : (
                <span className='shrink-0 font-mono text-[10px] text-text-faint'>return ↵</span>
            )}
        </div>
    );
};
