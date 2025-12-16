import { ButtonVariant } from '@/components/ui/buttons/action-button';

type DropdownMenuItemProps = {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: ButtonVariant;
    focus?: boolean;
};

export const DropdownMenuItem = ({
    label,
    onClick,
    icon,
    variant = ButtonVariant.Primary,
    focus = false
}: DropdownMenuItemProps) => {
    const getTextColor = () => {
        if (variant === ButtonVariant.Danger) return 'text-red-400';
        return 'text-white';
    };

    return (
        <button
            className={`
                w-full px-4 py-2 text-left
                flex gap-2 items-center justify-between
                hover:bg-slate-600
                ${focus ? 'bg-slate-600' : ''}
                ${getTextColor()}
            `}
            onClick={onClick}
        >
            <span>{label}</span>
            {icon}
        </button>
    );
};
