import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { LoadingPage } from '@/components/layouts/loading-page';
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
        return <LoadingPage />;
    }

    // Don't render children if not authenticated
    if (!isAuthenticated) {
        return <LoadingPage />;
    }

    return <>{children}</>;
};
