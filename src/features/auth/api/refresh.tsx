import { AuthenticationService, type Token, type RefreshTokenRequest } from '@/api';

export const Refresh = async (refreshTokenRequest: RefreshTokenRequest): Promise<Token> => {
    return await AuthenticationService.refreshTokenAuthRefreshPost(refreshTokenRequest);
};
