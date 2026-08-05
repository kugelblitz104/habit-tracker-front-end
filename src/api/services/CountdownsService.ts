/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CountdownCreate } from '../models/CountdownCreate';
import type { CountdownList } from '../models/CountdownList';
import type { CountdownRead } from '../models/CountdownRead';
import type { CountdownUpdate } from '../models/CountdownUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CountdownsService {
    /**
     * List countdowns for a profile
     * List a profile's countdowns, soonest target first.
     * @param profileId The profile whose countdowns to list
     * @param limit
     * @param offset
     * @returns CountdownList Successful Response
     * @throws ApiError
     */
    public static listCountdownsCountdownsGet(
        profileId: number,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<CountdownList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/countdowns/',
            query: {
                'profile_id': profileId,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create a countdown
     * Create a countdown. `task_id` is optional; when set it must reference a
     * task in the same profile. `category_id` selects an existing group, which must
     * belong to the same profile; `category` files the countdown by name instead,
     * creating the group if the name is new, and the first countdown in a new group
     * seeds its colour from its own `color`. Sending both uses `category_id` and
     * takes `category` from that record.
     * @param requestBody
     * @returns CountdownRead Successful Response
     * @throws ApiError
     */
    public static createCountdownCountdownsPost(
        requestBody: CountdownCreate,
    ): CancelablePromise<CountdownRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/countdowns/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete all countdowns in a profile
     * Delete every countdown in a profile.
     *
     * - **profile_id**: The profile whose countdowns to delete (required)
     *
     * This action cannot be undone. Linked tasks are not affected.
     * @param profileId The profile whose countdowns to delete
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteAllCountdownsCountdownsDelete(
        profileId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/countdowns/',
            query: {
                'profile_id': profileId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a countdown by ID
     * @param countdownId
     * @returns CountdownRead Successful Response
     * @throws ApiError
     */
    public static readCountdownCountdownsCountdownIdGet(
        countdownId: number,
    ): CancelablePromise<CountdownRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/countdowns/{countdown_id}',
            path: {
                'countdown_id': countdownId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a countdown (partial update)
     * Update a countdown. `profile_id` moves it to another profile of the same
     * user. `category_id` re-files it into an existing group in the same profile and
     * a null clears the group; `category` re-files it by name instead, creating the
     * group if the name is new. Sending both uses `category_id`. The group also
     * re-resolves on a profile move, since a group belongs to one profile.
     * @param countdownId
     * @param requestBody
     * @returns CountdownRead Successful Response
     * @throws ApiError
     */
    public static patchCountdownCountdownsCountdownIdPatch(
        countdownId: number,
        requestBody: CountdownUpdate,
    ): CancelablePromise<CountdownRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/countdowns/{countdown_id}',
            path: {
                'countdown_id': countdownId,
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
     * Delete a countdown
     * @param countdownId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteCountdownCountdownsCountdownIdDelete(
        countdownId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/countdowns/{countdown_id}',
            path: {
                'countdown_id': countdownId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
