import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';

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
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto'></div>
                    <p className='mt-4 text-gray-600'>Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render children if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
};
