import { Button } from '@headlessui/react';

export enum ButtonVariant {
    Primary = 'primary',
    Secondary = 'secondary',
    Danger = 'danger',
    Submit = 'submit'
}

type ActionButtonProps = {
    label: string;
    onClick?: () => void;
    className?: string;
    icon?: React.ReactNode;
    variant?: ButtonVariant;
    disabled?: boolean;
};

export const ActionButton = ({
    label,
    onClick,
    className,
    icon,
    variant = ButtonVariant.Primary,
    disabled = false
}: ActionButtonProps) => {
    const variants = {
        primary:
            'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-400 disabled:cursor-not-allowed',
        secondary:
            'bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed',
        danger: 'bg-red-700 hover:bg-red-800 disabled:bg-red-400 disabled:cursor-not-allowed',
        submit: 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed'
    };

    return (
        <Button
            disabled={disabled}
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
