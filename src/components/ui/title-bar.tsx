import { AddButton } from '@/features/habits/components/add-button';
import type { HabitCreate } from '@/types/types';

type TitleBarProps = {
    onAddHabitClick?: () => void;
};

export const TitleBar = ({ 
    onAddHabitClick 
}: TitleBarProps) => {
    return (
        <div className='p-4 mb-4 bg-slate-800 relative'>
            <div className='flex items-center'>
                <h1 className='text-xl'>Habit Tracker</h1>
                <AddButton className='absolute right-4' onClick={() => onAddHabitClick?.()} />
            </div>
        </div>
    );
}