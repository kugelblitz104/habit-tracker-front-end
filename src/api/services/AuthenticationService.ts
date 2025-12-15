/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_login_auth_login_post } from '../models/Body_login_auth_login_post';
import type { RefreshTokenRequest } from '../models/RefreshTokenRequest';
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
}
