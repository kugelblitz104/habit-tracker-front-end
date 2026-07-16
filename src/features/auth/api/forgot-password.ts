import {
    AuthenticationService,
    type ForgotPasswordRequest,
    type MessageResponse
} from '@/api';

/**
 * Begin a password reset. The backend always returns the same generic message
 * whether or not the email is registered (no account enumeration), so callers
 * should show a neutral "check your email" confirmation on success.
 */
export const ForgotPassword = async (
    request: ForgotPasswordRequest
): Promise<MessageResponse> => {
    return await AuthenticationService.forgotPasswordAuthForgotPasswordPost(request);
};
