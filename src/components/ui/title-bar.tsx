import { ButtonVariant } from '@/components/ui/buttons/action-button';
import { DropdownMenuItem } from '@/components/ui/buttons/dropdown-menu-item';
import { LogoutModal } from '@/features/auth/components/modals/logout-modal';
import { useAuth } from '@/lib/auth-context';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { CheckCheck, ChevronLeft, Ellipsis, LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

export type ActionConfig = {
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

export const TitleBar = ({ title = 'Habit Tracker', actions = [] }: TitleBarProps) => {
    const { isAuthenticated, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const showBackButton = !['/', '/login', '/register'].includes(location.pathname);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const menuActions = useMemo(() => {
        const allActions = [...actions];

        if (isAuthenticated && !showBackButton) {
            allActions.push({
                label: 'Logout',
                onClick: () => setLogoutModalOpen(true),
                icon: <LogOut size={20} />,
                variant: ButtonVariant.Danger
            });
        }

        return allActions;
    }, [actions, isAuthenticated, showBackButton]);

    return (
        <div className='p-4 bg-slate-700 relative'>
            <div className='flex items-center min-h-10'>
                {showBackButton && (
                    <Link to='/'>
                        <ChevronLeft size={24} className='mr-2 select-none' />
                    </Link>
                )}
                {location.pathname === '/' && <CheckCheck className='mr-2 select-none' />}
                <h1 className='text-xl truncate select-none'>{title}</h1>
                {menuActions.length > 0 && (
                    <div className='flex flex-row-reverse items-center gap-2 ml-auto'>
                        <Menu>
                            <MenuButton
                                className='p-2 hover:bg-slate-600 rounded-md'
                                aria-label='Open actions menu'
                            >
                                <Ellipsis />
                            </MenuButton>
                            <MenuItems
                                anchor='bottom'
                                className='bg-slate-700 border border-slate-600 rounded-md shadow-lg min-w-48'
                            >
                                {menuActions.map((action, index) => (
                                    <MenuItem key={index}>
                                        {({ focus }) => (
                                            <DropdownMenuItem
                                                label={action.label}
                                                onClick={action.onClick}
                                                icon={action.icon}
                                                variant={action.variant}
                                                focus={focus}
                                            />
                                        )}
                                    </MenuItem>
                                ))}
                            </MenuItems>
                        </Menu>
                    </div>
                )}
            </div>
            <LogoutModal
                isOpen={logoutModalOpen}
                onClose={() => setLogoutModalOpen(false)}
                handleLogout={handleLogout}
            />
        </div>
    );
};
