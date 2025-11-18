import { AddButton } from '@/features/habits/components/add-button';
import { useAuth } from '@/lib/auth-context';
import { LogoutButton } from '../auth/logout-button';
import { Link, useLocation } from 'react-router';
import { CheckCheck, ChevronLeft } from 'lucide-react';

type TitleBarProps = {
    title?: string;
    onAddHabitClick?: () => void;
};

export const TitleBar = ({
    title = 'Habit Tracker',
    onAddHabitClick
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
