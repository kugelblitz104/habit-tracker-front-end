import { Button } from '@headlessui/react';
import { type ReactNode } from 'react';

export type ToggleButtonProps = {
    children: ReactNode;
    isActive: boolean;
    onClick: () => void;
};

export const ToggleButton = ({ children, isActive, onClick }: ToggleButtonProps) => {
    return (
        <Button
            onClick={onClick}
            className={`flex-1 rounded-chip border px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] outline-none transition-colors focus-visible:opacity-80 ${
                isActive
                    ? 'text-habit-label'
                    : 'text-text-muted hover:text-text-secondary'
            }`}
            style={{
                backgroundColor: isActive ? 'rgba(120, 168, 205, 0.14)' : 'transparent',
                borderColor: isActive
                    ? 'rgba(120, 168, 205, 0.35)'
                    : 'var(--surface-card-border)'
            }}
            aria-pressed={isActive}
        >
            {children}
        </Button>
    );
};
