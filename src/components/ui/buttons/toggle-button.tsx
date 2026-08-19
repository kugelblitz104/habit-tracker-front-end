import { type ReactNode } from 'react';

export type ToggleButtonProps = {
    children: ReactNode;
    isActive: boolean;
    onClick: () => void;
};

// Plain <button>, not Headless UI's: no Dialog/Menu/Popover context is in
// play here, so its render-prop behaviour adds nothing, and its active-tint
// colours don't match any app <Button> variant's chrome.
export const ToggleButton = ({ children, isActive, onClick }: ToggleButtonProps) => {
    return (
        <button
            type='button'
            onClick={onClick}
            className={`min-h-[36px] flex-1 rounded-chip border px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] outline-none transition-colors pointer-coarse:min-h-[44px] focus-visible:opacity-80 ${
                isActive ? 'text-habit-label' : 'text-text-muted hover:text-text-secondary'
            }`}
            style={{
                backgroundColor: isActive ? 'rgba(120, 168, 205, 0.14)' : 'transparent',
                borderColor: isActive ? 'rgba(120, 168, 205, 0.35)' : 'var(--surface-card-border)'
            }}
            aria-pressed={isActive}
        >
            {children}
        </button>
    );
};
