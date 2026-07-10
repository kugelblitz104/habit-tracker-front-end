/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProfileCreate } from '../models/ProfileCreate';
import type { ProfileList } from '../models/ProfileList';
import type { ProfileRead } from '../models/ProfileRead';
import type { ProfileUpdate } from '../models/ProfileUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProfilesService {
    /**
     * List profiles for the current user
     * Get the current user's profiles, ordered by creation date.
     *
     * - **user_id**: Optional. Admins may pass another user's ID to list that
     * user's profiles. Non-admins may only list their own.
     * - **limit**: Maximum number of profiles to return (default: 100, max: 100)
     * - **offset**: Number of profiles to skip (default: 0)
     * @param userId List another user's profiles (admins only)
     * @param limit Maximum number of profiles to return (1-100)
     * @param offset Number of profiles to skip
     * @returns ProfileList Successful Response
     * @throws ApiError
     */
    public static listProfilesProfilesGet(
        userId?: (number | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<ProfileList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/profiles/',
            query: {
                'user_id': userId,
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
     * Create a new profile
     * Create a new profile for the current user with the following information:
     *
     * - **name**: Name of the profile (unique per user, e.g. "Personal", "Work")
     * - **color_start**: Starting hex color of the avatar gradient
     * - **color_end**: Ending hex color of the avatar gradient
     * - **habits_enabled**: Whether the habits surface is enabled for this profile
     * - **calendar_enabled**: Whether the calendar surface is enabled for this profile
     * - **publish_to_azure**: Whether to publish tasks to Azure DevOps (placeholder)
     * - **default_landing**: Landing page for this profile ('today' or 'habits')
     * - **week_start_monday**: Whether calendars/weekday charts start on Monday (default: true)
     * - **use_habit_color_accent**: Whether the habit detail view uses the habit's own color as its accent (default: false)
     *
     * Profiles are personal - they always belong to the authenticated user.
     * @param requestBody
     * @returns ProfileRead Successful Response
     * @throws ApiError
     */
    public static createProfileProfilesPost(
        requestBody: ProfileCreate,
    ): CancelablePromise<ProfileRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/profiles/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a profile by ID
     * Retrieve a specific profile by its ID.
     *
     * - **profile_id**: The unique identifier of the profile to retrieve
     * @param profileId
     * @returns ProfileRead Successful Response
     * @throws ApiError
     */
    public static readProfileProfilesProfileIdGet(
        profileId: number,
    ): CancelablePromise<ProfileRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/profiles/{profile_id}',
            path: {
                'profile_id': profileId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a profile (partial update)
     * Update specific fields of an existing profile. Only provided fields will be updated.
     *
     * - **profile_id**: The unique identifier of the profile to update
     *
     * You can update any combination of these fields:
     * - **name**: Name of the profile (unique per user)
     * - **color_start**: Starting hex color of the avatar gradient
     * - **color_end**: Ending hex color of the avatar gradient
     * - **habits_enabled**: Whether the habits surface is enabled for this profile
     * - **calendar_enabled**: Whether the calendar surface is enabled for this profile
     * - **publish_to_azure**: Whether to publish tasks to Azure DevOps (placeholder)
     * - **default_landing**: Landing page for this profile ('today' or 'habits')
     * - **week_start_monday**: Whether calendars/weekday charts start on Monday
     * - **use_habit_color_accent**: Whether the habit detail view uses the habit's own color as its accent
     * @param profileId
     * @param requestBody
     * @returns ProfileRead Successful Response
     * @throws ApiError
     */
    public static patchProfileProfilesProfileIdPatch(
        profileId: number,
        requestBody: ProfileUpdate,
    ): CancelablePromise<ProfileRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/profiles/{profile_id}',
            path: {
                'profile_id': profileId,
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
     * Delete a profile
     * Delete a profile by its ID.
     *
     * - **profile_id**: The unique identifier of the profile to delete
     *
     * This action cannot be undone. All habits, projects, and tasks belonging
     * to the profile are cascade deleted. A user's last remaining profile
     * cannot be deleted.
     * @param profileId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteProfileProfilesProfileIdDelete(
        profileId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/profiles/{profile_id}',
            path: {
                'profile_id': profileId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
