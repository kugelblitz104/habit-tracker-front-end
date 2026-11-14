import { AuthenticationService } from '@/api';

/**
 * Asks the server to revoke this user's tokens. Best effort: the caller clears
 * local state regardless, so a failure here must never surface.
 */
export const Logout = async (): Promise<void> => {
    try {
        await AuthenticationService.logoutAuthLogoutPost();
    } catch {
        // Offline or already-revoked: the local sign-out still proceeds.
    }
};
