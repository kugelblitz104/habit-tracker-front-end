import { Button } from '@headlessui/react';
import { Trash } from 'lucide-react';
import { useState } from 'react';

export type DeleteButtonProps = {
    onClick: () => void;
    isActive?: boolean;
};

export const DeleteButton = ({
    onClick,
    isActive = false
}: DeleteButtonProps) => {
    const [isHover, setIsHover] = useState(false);

    return (
        <div className='flex absolute inset-0 bg-gray-950'>
            <Button
                type='button'
                onClick={onClick}
                title='Delete Habit'
                className='px-4 align-middle'
                onMouseEnter={() => setIsHover(true)}
                onMouseLeave={() => setIsHover(false)}
            >
                <Trash size={18} color={isHover ? 'red' : 'white'} />
            </Button>
        </div>
    );
};
