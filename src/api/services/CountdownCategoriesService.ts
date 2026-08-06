/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CountdownCategoryCreate } from '../models/CountdownCategoryCreate';
import type { CountdownCategoryList } from '../models/CountdownCategoryList';
import type { CountdownCategoryRead } from '../models/CountdownCategoryRead';
import type { CountdownCategoryUpdate } from '../models/CountdownCategoryUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CountdownCategoriesService {
    /**
     * List countdown categories for a profile
     * List a profile's countdown categories, ordered by name.
     *
     * Includes categories with no countdowns: a group's colour outlives its members,
     * so a category emptied and later refilled keeps the colour it was given. The
     * grouped views only render categories that have a countdown in range.
     * @param profileId The profile whose countdown categories to list
     * @param limit
     * @param offset
     * @returns CountdownCategoryList Successful Response
     * @throws ApiError
     */
    public static listCountdownCategoriesCountdownCategoriesGet(
        profileId: number,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<CountdownCategoryList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/countdown-categories/',
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
     * Create a countdown category
     * Create a countdown category.
     *
     * - **profile_id**: The profile this category belongs to
     * - **name**: The category's name, unique within the profile
     * - **color**: Optional hex colour for the group
     *
     * Fails with 409 if a category with this name already exists in the profile.
     * @param requestBody
     * @returns CountdownCategoryRead Successful Response
     * @throws ApiError
     */
    public static createCountdownCategoryCountdownCategoriesPost(
        requestBody: CountdownCategoryCreate,
    ): CancelablePromise<CountdownCategoryRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/countdown-categories/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete all countdown categories in a profile
     * Delete every countdown category in a profile.
     *
     * - **profile_id**: The profile whose countdown categories to delete (required)
     *
     * This action cannot be undone. Countdowns that were in a deleted category
     * are kept and become uncategorised.
     * @param profileId The profile whose countdown categories to delete
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteAllCountdownCategoriesCountdownCategoriesDelete(
        profileId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/countdown-categories/',
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
     * Get a countdown category by ID
     * @param categoryId
     * @returns CountdownCategoryRead Successful Response
     * @throws ApiError
     */
    public static readCountdownCategoryCountdownCategoriesCategoryIdGet(
        categoryId: number,
    ): CancelablePromise<CountdownCategoryRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/countdown-categories/{category_id}',
            path: {
                'category_id': categoryId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a countdown category (partial update)
     * Update a countdown category. Only provided fields are updated.
     *
     * Setting **color** to null clears it; setting **name** to null is rejected.
     *
     * Fails with 409 if the new name is already used by another category in the
     * same profile.
     * @param categoryId
     * @param requestBody
     * @returns CountdownCategoryRead Successful Response
     * @throws ApiError
     */
    public static patchCountdownCategoryCountdownCategoriesCategoryIdPatch(
        categoryId: number,
        requestBody: CountdownCategoryUpdate,
    ): CancelablePromise<CountdownCategoryRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/countdown-categories/{category_id}',
            path: {
                'category_id': categoryId,
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
     * Delete a countdown category
     * Delete a countdown category by its ID.
     *
     * This action cannot be undone. Countdowns in the category are kept and
     * become uncategorised.
     * @param categoryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteCountdownCategoryCountdownCategoriesCategoryIdDelete(
        categoryId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/countdown-categories/{category_id}',
            path: {
                'category_id': categoryId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
