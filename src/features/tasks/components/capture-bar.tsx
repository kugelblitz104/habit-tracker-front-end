import { Plus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

type CaptureBarProps = {
    /** Create a task from the typed title. Resolve clears the field; reject keeps it. */
    onCapture: (title: string) => Promise<void>;
    disabled?: boolean;
    isPending?: boolean;
};

/**
 * Full-width quick-capture input: leading +, README placeholder, trailing
 * "return ↵" hint. Enter creates a task and clears the field only once the
 * create succeeds; on failure the typed text is preserved for a retry.
 */
export const CaptureBar = ({ onCapture, disabled = false, isPending = false }: CaptureBarProps) => {
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

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        }
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
            <Plus size={18} className='shrink-0 text-text-muted' />
            <input
                type='text'
                value={value}
                disabled={disabled || isPending}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Add a task — type a title and press enter'
                aria-label='Add a task'
                className='min-w-0 flex-1 bg-transparent font-display text-[14px] text-text-primary outline-none placeholder:text-text-faint'
            />
            <span className='shrink-0 font-mono text-[10px] text-text-faint'>return ↵</span>
        </div>
    );
};
