import { ActionButton } from '@/components/ui/buttons/action-button';
import { useAuth } from '@/lib/auth-context';
import { CheckCheck, ChevronLeft, LogOut, Plus, Trash } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

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
    const { isAuthenticated, logout } = useAuth();
    const location = useLocation();
    const showBackButton = !['/', '/login'].includes(location.pathname);
    const navigate = useNavigate();

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
                    {isAuthenticated && !showBackButton && (
                        <ActionButton
                            className='flex-row-reverse'
                            onClick={() => {
                                logout();
                                navigate('/login', { replace: true });
                            }}
                            variant='danger'
                            label='Logout'
                            icon={<LogOut />}
                        />
                    )}
                    {onAddHabitClick && (
                        <ActionButton
                            className=''
                            onClick={() => onAddHabitClick?.()}
                            variant='primary'
                            label='Add Habit'
                            icon={<Plus />}
                        />
                    )}
                    {onDeleteHabitClick && (
                        <ActionButton
                            className=''
                            onClick={() => onDeleteHabitClick?.()}
                            variant='danger'
                            label='Delete'
                            icon={<Trash />}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
