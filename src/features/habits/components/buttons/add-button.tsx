import { Button } from '@headlessui/react';
import { Plus } from 'lucide-react';

type AddButtonProps = {
    onClick?: () => void;
    className?: string;
};

export const AddButton = ({ onClick, className }: AddButtonProps) => {
    return (
        <Button
            className={`px-4 py-2 flex items-center rounded-md font-medium ${className}
            hover:bg-slate-700`}
            onClick={onClick}
        >
            <Plus className='mr-1' /> Add Habit
        </Button>
    );
};
