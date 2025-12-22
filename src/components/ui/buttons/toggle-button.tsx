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
            className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                isActive
                    ? 'bg-sky-600 text-white hover:bg-sky-700'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
            aria-pressed={isActive}
        >
            {children}
        </Button>
    );
};
