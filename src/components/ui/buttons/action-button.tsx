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
};

export const ActionButton = ({
    label,
    onClick,
    className,
    icon,
    variant = ButtonVariant.Primary
}: ActionButtonProps) => {
    const variants = {
        primary: 'bg-slate-700 hover:bg-slate-600',
        secondary: 'bg-slate-600 hover:bg-slate-700',
        danger: 'bg-red-700 hover:bg-red-800',
        submit: 'bg-sky-600 hover:bg-sky-700'
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
