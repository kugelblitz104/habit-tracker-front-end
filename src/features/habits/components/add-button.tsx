import { Plus } from "lucide-react";

type AddButtonProps = {
    onClick?: () => void;
    className?: string;
};

export const AddButton = ({ 
    onClick, 
    className
}: AddButtonProps) => {
    return (
        <button 
            className={`flex items-center ${className}`} 
            onClick={onClick}
        >
            <Plus className="mr-1" /> Add Habit
        </button>
    );
}