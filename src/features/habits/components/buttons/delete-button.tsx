import { Trash } from 'lucide-react';

interface DeleteButtonProps {
    onClick?: () => void;
    className?: string;
}

export const DeleteButton = ({
    onClick,
    className = ''
}: DeleteButtonProps) => {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center 
                gap-2 px-4 py-2 
                font-medium text-white
                bg-red-700 hover:bg-red-800 
                rounded-md 
                ${className}`}
        >
            <Trash />
            Delete
        </button>
    );
};
