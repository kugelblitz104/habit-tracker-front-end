import {
    ActionButton,
    ButtonVariant
} from '@/components/ui/buttons/action-button';
import { useAuth } from '@/lib/auth-context';
import { CheckCheck, ChevronLeft, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

type ActionConfig = {
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    variant?: ButtonVariant;
    reversed?: boolean;
};

type TitleBarProps = {
    title?: string;
    actions?: ActionConfig[];
};

export const TitleBar = ({
    title = 'Habit Tracker',
    actions = []
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
                {location.pathname === '/' && <CheckCheck className='mr-2' />}
                <h1 className='text-xl'>{title}</h1>
                <div className='flex flex-row-reverse items-center gap-2 ml-auto'>
                    {isAuthenticated && !showBackButton && (
                        <ActionButton
                            className='flex-row-reverse'
                            onClick={() => {
                                logout();
                                navigate('/login', { replace: true });
                            }}
                            variant={ButtonVariant.Danger}
                            label='Logout'
                            icon={<LogOut />}
                        />
                    )}
                    {actions.map((action, index) => (
                        <ActionButton
                            key={index}
                            className={
                                action.reversed ? 'flex-row-reverse' : ''
                            }
                            onClick={action.onClick}
                            variant={action.variant}
                            label={action.label}
                            icon={action.icon}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
