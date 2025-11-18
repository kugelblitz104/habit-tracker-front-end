import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { LoadingScreen } from '@/components/layouts/loading-screen';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Redirect to login page if not authenticated
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Show loading state while checking authentication
    if (isLoading) {
        return <LoadingScreen />;
    }

    // Don't render children if not authenticated
    if (!isAuthenticated) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
};
