import { type ReactNode } from 'react';

export type ToggleButtonProps = {
    children: ReactNode;
    isActive: boolean;
    onClick: () => void;
};

export const ToggleButton = ({
    children,
    isActive,
    onClick
}: ToggleButtonProps) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
        >
            {children}
        </button>
    );
};
