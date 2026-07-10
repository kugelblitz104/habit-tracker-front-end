import { OpenAPI, type ProfileRead } from '@/api';
import { useProfiles } from '@/features/profiles/api/get-profiles';
import { getUser } from '@/features/users/api/get-users';
import { useQueryClient } from '@tanstack/react-query';
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';
import { getUserIdFromToken, isTokenExpired } from './token-utils';

const ACTIVE_PROFILE_STORAGE_KEY = 'active_profile';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    created_date: string;
    updated_date?: string | null;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authorize: (accessToken: string, refreshToken: string) => Promise<void>;
    logout: () => void;
    /** The full active profile record, or null until profiles have loaded. */
    activeProfile: ProfileRead | null;
    /** The active profile's id, or null when unauthenticated / not yet resolved. */
    activeProfileId: number | null;
    /** All of the current user's profiles (empty until loaded). */
    profiles: ProfileRead[];
    /** Switch the active profile (persisted to localStorage). */
    setActiveProfileId: (profileId: number) => void;
    /** True while the profile list is loading (named to avoid clashing with auth's own isLoading). */
    profilesLoading: boolean;
}

// Exported so the dev-only /dev/debug playground can render the login /
// register pages under a stubbed "signed-out" context (their real
// isAuthenticated redirect would otherwise bounce an authed dev to `/`).
// App code should keep using AuthProvider / useAuth.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!token && !!user;

    // ---- Active profile (folded in from the former ActiveProfileProvider) ----
    const profilesQuery = useProfiles({
        queryConfig: { enabled: isAuthenticated }
    });
    const profiles = useMemo(
        () => profilesQuery.data?.profiles ?? [],
        [profilesQuery.data]
    );

    const [activeProfileId, setActiveProfileIdState] = useState<number | null>(null);
    const [profileHydrated, setProfileHydrated] = useState(false);

    // Read the persisted selection once, on the client, after mount.
    useEffect(() => {
        const stored = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
        if (stored) {
            const parsed = Number(stored);
            if (!Number.isNaN(parsed)) {
                setActiveProfileIdState(parsed);
            }
        }
        setProfileHydrated(true);
    }, []);

    // Default to the user's first profile when nothing valid is selected
    // (also guards against deleted / foreign ids). Persist the healed
    // selection too — otherwise every reload replays the stale stored id
    // (and its 404s) until profiles load. The setItem inside the updater is
    // idempotent, so StrictMode's double-invoke is harmless.
    useEffect(() => {
        if (!profileHydrated || profiles.length === 0) return;
        setActiveProfileIdState((current) => {
            if (current != null && profiles.some((p) => p.id === current)) {
                return current;
            }
            const fallbackId = profiles[0]!.id;
            localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, String(fallbackId));
            return fallbackId;
        });
    }, [profileHydrated, profiles]);

    // Reset the selection whenever the user isn't authenticated — but only
    // after the initial auth check has completed. The first render is always
    // unauthenticated (initAuth hasn't run yet), and resetting then would wipe
    // the localStorage-hydrated selection on every reload, bouncing the user
    // back to their first profile.
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            setActiveProfileIdState(null);
        }
    }, [isLoading, isAuthenticated]);

    const setActiveProfileId = (profileId: number) => {
        setActiveProfileIdState(profileId);
        localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, String(profileId));
    };

    const activeProfile = useMemo(
        () => profiles.find((p) => p.id === activeProfileId) ?? null,
        [profiles, activeProfileId]
    );

    const profilesLoading =
        isAuthenticated && (!profileHydrated || profilesQuery.isLoading);

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

    const authorize = async (accessToken: string, refreshToken: string) => {
        // Drop anything cached by a previous session before auth flips. With
        // staleTime set, queries re-enabled by this login would otherwise be
        // served the old session's cache (e.g. another user's ['profiles'])
        // instead of refetching with the new token.
        queryClient.clear();

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
        // Clear storage (including the active-profile selection so it can't leak
        // into the next user's session).
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);

        // Clear state
        setToken(null);
        setUser(null);
        setActiveProfileIdState(null);

        // Clear API client token
        OpenAPI.TOKEN = undefined;

        // Drop all cached server state so the next login can't render this
        // session's data (authorize() clears again as a belt-and-braces).
        queryClient.clear();
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated,
        isLoading,
        authorize,
        logout,
        activeProfile,
        activeProfileId,
        profiles,
        setActiveProfileId,
        profilesLoading
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
