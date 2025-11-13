import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';

interface LogoutButtonProps {
    className?: string;
}

export const LogoutButton = ({ className = '' }: LogoutButtonProps) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <button
            onClick={handleLogout}
            className={`px-4 py-2 font-medium text-white bg-red-700 hover:bg-red-800 rounded-md ${className}`}
        >
            Logout
        </button>
    );
};
