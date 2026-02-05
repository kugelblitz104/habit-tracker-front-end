import type { ReactNode } from 'react';

type CardProps = {
    children: ReactNode;
    title?: string;
    className?: string;
};

export const Card = ({ children, title, className = '' }: CardProps) => {
    return (
        <div
            className={`w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 ${className}`}
        >
            {title && (
                <h3 className='text-lg font-semibold leading-none tracking-tight mb-4'>{title}</h3>
            )}
            {children}
        </div>
    );
};
