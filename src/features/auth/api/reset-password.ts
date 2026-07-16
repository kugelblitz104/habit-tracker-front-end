import {
    AuthenticationService,
    type MessageResponse,
    type ResetPasswordRequest
} from '@/api';

/**
 * Complete a password reset with the token from the emailed link plus the new
 * password. Rejects (400) on a bad/expired token; the caller sends the user
 * back to /login on success.
 */
export const ResetPassword = async (
    request: ResetPasswordRequest
): Promise<MessageResponse> => {
    return await AuthenticationService.resetPasswordAuthResetPasswordPost(request);
};
