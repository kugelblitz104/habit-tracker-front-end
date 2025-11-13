import React, { createContext, useContext, useEffect, useState } from 'react';
import { OpenAPI } from '@/api';
import { getUserIdFromToken, isTokenExpired } from './token-utils';
import { getUser } from '@/features/users/api/get-users';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    created_date: string;
    updated_date?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (accessToken: string, refreshToken: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                // Check if token is expired
                if (isTokenExpired(storedToken)) {
                    console.log('Token expired, clearing auth state');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    setIsLoading(false);
                    return;
                }

                try {
                    const parsedUser = JSON.parse(storedUser);
                    setToken(storedToken);
                    setUser(parsedUser);
                    // Set token in OpenAPI client for all requests
                    OpenAPI.TOKEN = storedToken;
                } catch (error) {
                    console.error('Failed to parse stored user:', error);
                    // Clear invalid data
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (accessToken: string, refreshToken: string) => {
        // Store tokens
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        // Set token in API client
        OpenAPI.TOKEN = accessToken;
        setToken(accessToken);

        // Get user ID from token
        const userId = getUserIdFromToken(accessToken);

        if (userId) {
            try {
                // Fetch user details from API
                const userData = await getUser(userId);
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
            } catch (error) {
                console.error('Failed to fetch user data:', error);
                // If fetching user fails, create minimal user object
                const minimalUser: User = {
                    id: userId,
                    username: 'user',
                    email: 'user@example.com',
                    first_name: 'User',
                    last_name: '',
                    created_date: new Date().toISOString()
                };
                localStorage.setItem('user', JSON.stringify(minimalUser));
                setUser(minimalUser);
            }
        }
    };

    const logout = () => {
        // Clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        // Clear state
        setToken(null);
        setUser(null);

        // Clear API client token
        OpenAPI.TOKEN = undefined;
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout
    };

    return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
