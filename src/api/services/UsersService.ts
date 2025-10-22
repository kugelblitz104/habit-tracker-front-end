/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HabitList } from '../models/HabitList';
import type { UserCreate } from '../models/UserCreate';
import type { UserList } from '../models/UserList';
import type { UserRead } from '../models/UserRead';
import type { UserUpdate } from '../models/UserUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Create a new user
     * Create a new user with the following information:
     *
     * - **username**: Unique username for the user
     * - **first_name**: User's first name
     * - **last_name**: User's last name
     * - **email**: User's email address
     * - **password_hash**: Hashed password for authentication
     * @param requestBody
     * @returns UserRead Successful Response
     * @throws ApiError
     */
    public static createUserUsersPost(
        requestBody: UserCreate,
    ): CancelablePromise<UserRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/users/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * List all users
     * Get a paginated list of all users in the system.
     *
     * - **limit**: Maximum number of users to return (default: 5, max: 100)
     *
     * Returns a list of users with pagination metadata including total count.
     * @param limit Maximum number of users to return (1-100)
     * @returns UserList Successful Response
     * @throws ApiError
     */
    public static listUsersUsersGet(
        limit: number = 5,
    ): CancelablePromise<UserList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/',
            query: {
                'limit': limit,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a user by ID
     * Retrieve a specific user by their ID.
     *
     * - **user_id**: The unique identifier of the user to retrieve
     * @param userId
     * @returns UserRead Successful Response
     * @throws ApiError
     */
    public static readUserUsersUserIdGet(
        userId: number,
    ): CancelablePromise<UserRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Replace a user (full update)
     * Replace all fields of an existing user. All fields must be provided.
     *
     * This performs a full replacement of the user resource.
     * Use PATCH if you want to update only specific fields.
     *
     * - **user_id**: The unique identifier of the user to update
     * @param userId
     * @param requestBody
     * @returns UserRead Successful Response
     * @throws ApiError
     */
    public static updateUserUsersUserIdPut(
        userId: number,
        requestBody: UserUpdate,
    ): CancelablePromise<UserRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/users/{user_id}',
            path: {
                'user_id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a user (partial update)
     * Update specific fields of an existing user. Only provided fields will be updated.
     *
     * This performs a partial update of the user resource.
     * Use PUT if you want to replace the entire resource.
     *
     * - **user_id**: The unique identifier of the user to update
     *
     * You can update any combination of these fields:
     * - **username**: Unique username for the user
     * - **first_name**: User's first name
     * - **last_name**: User's last name
     * - **email**: User's email address
     * - **password_hash**: Hashed password for authentication
     * @param userId
     * @param requestBody
     * @returns UserRead Successful Response
     * @throws ApiError
     */
    public static patchUserUsersUserIdPatch(
        userId: number,
        requestBody: UserUpdate,
    ): CancelablePromise<UserRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/users/{user_id}',
            path: {
                'user_id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete a user
     * Delete a user by their ID.
     *
     * - **user_id**: The unique identifier of the user to delete
     *
     * This action cannot be undone.
     * @param userId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteUserUsersUserIdDelete(
        userId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/users/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * List all habits for a user
     * Get a paginated list of all habits belonging to a specific user.
     *
     * - **user_id**: The unique identifier of the user
     * - **limit**: Maximum number of habits to return (default: 5, max: 100)
     * @param userId
     * @param limit Maximum number of habits to return (1-100)
     * @returns HabitList Successful Response
     * @throws ApiError
     */
    public static listUserHabitsUsersUserIdHabitsGet(
        userId: number,
        limit: number = 5,
    ): CancelablePromise<HabitList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/{user_id}/habits',
            path: {
                'user_id': userId,
            },
            query: {
                'limit': limit,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
