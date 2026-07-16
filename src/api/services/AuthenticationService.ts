/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_login_auth_login_post } from '../models/Body_login_auth_login_post';
import type { ForgotPasswordRequest } from '../models/ForgotPasswordRequest';
import type { MessageResponse } from '../models/MessageResponse';
import type { RefreshTokenRequest } from '../models/RefreshTokenRequest';
import type { ResetPasswordRequest } from '../models/ResetPasswordRequest';
import type { Token } from '../models/Token';
import type { UserCreate } from '../models/UserCreate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Register
     * @param requestBody
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static registerAuthRegisterPost(
        requestBody: UserCreate,
    ): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Login
     * OAuth2 compatible token login, get an access token for future requests.
     *
     * Use username (or email) and password to login.
     * The username field accepts either username or email.
     * @param formData
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static loginAuthLoginPost(
        formData: Body_login_auth_login_post,
    ): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/login',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Refresh Token
     * @param requestBody
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static refreshTokenAuthRefreshPost(
        requestBody: RefreshTokenRequest,
    ): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Forgot Password
     * Begin a password reset.
     *
     * Always returns the same response whether or not the email is registered, so
     * the endpoint can't be used to enumerate accounts. When a matching user
     * exists, a short-lived reset link is emailed (or logged, in dev) in the
     * background so the response time doesn't reveal whether an account was found.
     * @param requestBody
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static forgotPasswordAuthForgotPasswordPost(
        requestBody: ForgotPasswordRequest,
    ): CancelablePromise<MessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/forgot-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reset Password
     * Complete a password reset using the token from the emailed link.
     *
     * The token is a stateless JWT with ``type == "reset"``; a bad/expired/
     * wrong-type token all yield the same generic 400 so nothing is leaked. The
     * ~30-minute expiry bounds the window in which a leaked link is usable.
     * @param requestBody
     * @returns MessageResponse Successful Response
     * @throws ApiError
     */
    public static resetPasswordAuthResetPasswordPost(
        requestBody: ResetPasswordRequest,
    ): CancelablePromise<MessageResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/reset-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
