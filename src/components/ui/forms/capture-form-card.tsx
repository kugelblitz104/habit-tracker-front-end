import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import type { KeyboardEvent, ReactNode } from 'react';

type CaptureFormCardProps = {
    children: ReactNode;
    /** Collapse back to the capture bar (Cancel, Escape, or after a create). */
    onCancel: () => void;
    onSubmit: () => void;
    canSubmit: boolean;
    isPending?: boolean;
    submitLabel: string;
    pendingLabel: string;
};

/**
 * Card that an expanded quick-add form renders into: it sits inline where the
 * capture bar was, owns the Escape-to-collapse handler, and carries the
 * Cancel / primary footer. The fields themselves are the caller's `children`.
 */
export const CaptureFormCard = ({
    children,
    onCancel,
    onSubmit,
    canSubmit,
    isPending = false,
    submitLabel,
    pendingLabel
}: CaptureFormCardProps) => {
    // Escape anywhere inside the card collapses it, discarding the draft.
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && !isPending) {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div
            className='mb-[30px] flex flex-col gap-3 rounded-button border p-4'
            style={CARD_SURFACE_STYLE}
            onKeyDown={handleKeyDown}
        >
            {children}
            <div className='mt-1 flex items-center justify-end gap-2'>
                <button
                    type='button'
                    onClick={onCancel}
                    disabled={isPending}
                    className='min-h-[28px] rounded-button px-3 py-1.5 font-display text-[12px] text-text-muted transition-colors pointer-coarse:min-h-[44px] hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50'
                >
                    Cancel
                </button>
                <button
                    type='button'
                    onClick={onSubmit}
                    disabled={!canSubmit}
                    className='min-h-[28px] rounded-button px-3 py-1.5 font-display text-[12px] font-semibold transition-opacity pointer-coarse:min-h-[44px] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                    style={{
                        background: 'var(--button-primary-gradient)',
                        color: 'var(--button-primary-text)'
                    }}
                >
                    {isPending ? pendingLabel : submitLabel}
                </button>
            </div>
        </div>
    );
};
