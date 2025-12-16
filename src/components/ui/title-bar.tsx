import { ButtonVariant } from '@/components/ui/buttons/action-button';
import { DropdownMenuItem } from '@/components/ui/buttons/dropdown-menu-item';
import { LogoutModal } from '@/features/auth/components/modals/logout-modal';
import { useAuth } from '@/lib/auth-context';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { CheckCheck, ChevronLeft, Ellipsis, LogOut } from 'lucide-react';
import { useState } from 'react';
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

    return (
        <div className='p-4 bg-slate-700 relative'>
            <div className='flex items-center min-h-10'>
                {showBackButton && (
                    <Link to='/'>
                        <ChevronLeft size={24} className='mr-2' />
                    </Link>
                )}
                {location.pathname === '/' && <CheckCheck className='mr-2' />}
                <h1 className='text-xl truncate'>{title}</h1>
                <div className='flex flex-row-reverse items-center gap-2 ml-auto'>
                    <Menu>
                        <MenuButton className='p-2 hover:bg-slate-600 rounded-md'>
                            <Ellipsis />
                        </MenuButton>
                        <MenuItems
                            anchor='bottom'
                            className='bg-slate-700 border border-slate-600 rounded-md shadow-lg min-w-48'
                        >
                            {actions.map((action, index) => (
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
                            {isAuthenticated && !showBackButton && (
                                <MenuItem key='logout'>
                                    {({ focus }) => (
                                        <DropdownMenuItem
                                            label='Logout'
                                            onClick={() => setLogoutModalOpen(true)}
                                            icon={<LogOut size={20} />}
                                            variant={ButtonVariant.Danger}
                                            focus={focus}
                                        />
                                    )}
                                </MenuItem>
                            )}
                        </MenuItems>
                    </Menu>
                </div>
            </div>
            {logoutModalOpen && (
                <LogoutModal
                    isOpen={logoutModalOpen}
                    onClose={() => setLogoutModalOpen(false)}
                    handleLogout={handleLogout}
                />
            )}
        </div>
    );
};
