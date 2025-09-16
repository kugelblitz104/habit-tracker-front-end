import { AddButton } from '@/features/habits/components/add-button';

type TitleBarProps = {
    title?: string;
    onAddHabitClick?: () => void;
};

export const TitleBar = ({
    title = 'Habit Tracker',
    onAddHabitClick
}: TitleBarProps) => {
    return (
        <div className='p-4 mb-4 bg-slate-800 relative'>
            <div className='flex items-center'>
                <h1 className='text-xl'>{title}</h1>
                {onAddHabitClick && (
                    <AddButton
                        className='absolute right-4'
                        onClick={() => onAddHabitClick?.()}
                    />
                )}
            </div>
        </div>
    );
};
