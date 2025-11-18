import { Button } from '@headlessui/react';
import { Plus } from 'lucide-react';

type ActionButtonProps = {
    label: string;
    onClick?: () => void;
    className?: string;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
};

export const ActionButton = ({
    label,
    onClick,
    className,
    icon,
    variant = 'primary'
}: ActionButtonProps) => {
    const variants = {
        primary: 'hover:bg-slate-700',
        secondary: 'hover:bg-slate-600 hover:bg-slate-700',
        danger: 'bg-red-700 hover:bg-red-800'
    };

    return (
        <Button
            className={`
                px-4 py-2 
                flex gap-1 items-center 
                rounded-md 
                font-medium 
                ${variants[variant]}
                ${className}
            `}
            onClick={onClick}
        >
            {icon}
            {label}
        </Button>
    );
};
