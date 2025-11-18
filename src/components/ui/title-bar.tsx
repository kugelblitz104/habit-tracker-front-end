import { AddButton } from '@/features/habits/components/buttons/add-button';
import { useAuth } from '@/lib/auth-context';
import { LogoutButton } from '../../features/auth/components/logout-button';
import { Link, useLocation } from 'react-router';
import { CheckCheck, ChevronLeft } from 'lucide-react';
import { DeleteButton } from '@/features/habits/components/buttons/delete-button';

type TitleBarProps = {
    title?: string;
    onAddHabitClick?: () => void;
    onDeleteHabitClick?: () => void;
};

export const TitleBar = ({
    title = 'Habit Tracker',
    onAddHabitClick,
    onDeleteHabitClick
}: TitleBarProps) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const showBackButton = !['/', '/login'].includes(location.pathname);

    return (
        <div className='p-4 bg-slate-700 relative'>
            <div className='flex items-center min-h-10'>
                {showBackButton && (
                    <Link to='/'>
                        <ChevronLeft className='mr-2' />
                    </Link>
                )}
                {!showBackButton && <CheckCheck className='mr-2' />}
                <h1 className='text-xl'>{title}</h1>
                <div className='flex flex-row-reverse items-center gap-2 ml-auto'>
                    {isAuthenticated && !showBackButton && <LogoutButton />}
                    {onAddHabitClick && (
                        <AddButton
                            className=''
                            onClick={() => onAddHabitClick?.()}
                        />
                    )}
                    {onDeleteHabitClick && (
                        <DeleteButton
                            className=''
                            onClick={() => onDeleteHabitClick?.()}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
