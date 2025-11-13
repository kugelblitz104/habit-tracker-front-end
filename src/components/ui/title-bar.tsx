import { AddButton } from '@/features/habits/components/add-button';
import { useAuth } from '@/lib/auth-context';
import { LogoutButton } from '../auth/logout-button';

type TitleBarProps = {
    title?: string;
    onAddHabitClick?: () => void;
};

export const TitleBar = ({
    title = 'Habit Tracker',
    onAddHabitClick
}: TitleBarProps) => {
    const { isAuthenticated } = useAuth();
    return (
        <div className='p-4 mb-4 bg-slate-800 relative'>
            <div className='flex items-center min-h-10'>
                <h1 className='text-xl'>{title}</h1>
                <div className='flex flex-row-reverse items-center gap-2 ml-auto'>
                    {isAuthenticated && <LogoutButton />}
                    {onAddHabitClick && (
                        <AddButton
                            className=''
                            onClick={() => onAddHabitClick?.()}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
