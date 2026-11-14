import { AuthenticationService } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logout } from './logout';

describe('Logout', () => {
    afterEach(() => vi.restoreAllMocks());

    it('calls the logout endpoint', async () => {
        const spy = vi
            .spyOn(AuthenticationService, 'logoutAuthLogoutPost')
            .mockResolvedValue({ message: 'Signed out.' });
        await Logout();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('resolves even when the call rejects', async () => {
        vi.spyOn(AuthenticationService, 'logoutAuthLogoutPost').mockRejectedValue(
            new Error('offline')
        );
        await expect(Logout()).resolves.toBeUndefined();
    });
});
