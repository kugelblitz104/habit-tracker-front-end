import { Button } from '@headlessui/react';
import { Plus } from 'lucide-react';

type AddButtonProps = {
    onClick?: () => void;
    className?: string;
};

export const AddButton = ({ 
    onClick, 
    className
}: AddButtonProps) => {
    return (
        <Button 
            className={`p-2 flex items-center rounded-md ${className}
            hover:bg-slate-700`} 
            onClick={onClick}
        >
            <Plus className='mr-1' /> Add Habit
        </Button>
    );
}