/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HabitCreate } from '../models/HabitCreate';
import type { HabitRead } from '../models/HabitRead';
import type { HabitUpdate } from '../models/HabitUpdate';
import type { TrackerList } from '../models/TrackerList';
import type { TrackerLiteList } from '../models/TrackerLiteList';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HabitsService {
    /**
     * Create a new habit
     * Create a new habit with the following information:
     *
     * - **user_id**: The ID of the user who owns this habit
     * - **name**: Name of the habit
     * - **question**: The daily question to prompt for this habit
     * - **color**: Color code for visual representation
     * - **frequency**: How many times the habit should be completed within the range
     * - **range**: The number of days within which the frequency should be met
     * - **reminder**: Whether to enable reminders for this habit
     * - **notes**: Optional additional notes about the habit
     * - **archived**: Whether the habit is archived
     * - **sort_order**: The order in which the habit appears in lists (ascending)
     * @param requestBody
     * @returns HabitRead Successful Response
     * @throws ApiError
     */
    public static createHabitHabitsPost(
        requestBody: HabitCreate,
    ): CancelablePromise<HabitRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/habits/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reorder habits
     * Reorder habits by providing their IDs in the desired display order.
     *
     * - **habit_ids**: List of habit IDs in the order you want them displayed
     *
     * The first ID gets the lowest sort_order, last ID gets the highest.
     * Habits are displayed in ascending sort_order.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static sortHabitsHabitsSortPut(
        requestBody: Array<number>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/habits/sort',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a habit by ID
     * Retrieve a specific habit by its ID.
     *
     * - **habit_id**: The unique identifier of the habit to retrieve
     * @param habitId
     * @returns HabitRead Successful Response
     * @throws ApiError
     */
    public static readHabitHabitsHabitIdGet(
        habitId: number,
    ): CancelablePromise<HabitRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/habits/{habit_id}',
            path: {
                'habit_id': habitId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Replace a habit (full update)
     * Replace all fields of an existing habit. All fields must be provided.
     *
     * This performs a full replacement of the habit resource.
     * Use PATCH if you want to update only specific fields.
     *
     * - **habit_id**: The unique identifier of the habit to update
     * @param habitId
     * @param requestBody
     * @returns HabitRead Successful Response
     * @throws ApiError
     */
    public static updateHabitHabitsHabitIdPut(
        habitId: number,
        requestBody: HabitUpdate,
    ): CancelablePromise<HabitRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/habits/{habit_id}',
            path: {
                'habit_id': habitId,
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
     * Update a habit (partial update)
     * Update specific fields of an existing habit. Only provided fields will be updated.
     *
     * This performs a partial update of the habit resource.
     * Use PUT if you want to replace the entire resource.
     *
     * - **habit_id**: The unique identifier of the habit to update
     *
     * You can update any combination of these fields:
     * - **name**: Name of the habit
     * - **question**: The daily question to prompt for this habit
     * - **color**: Color code for visual representation
     * - **frequency**: How many times the habit should be completed within the range
     * - **range**: The number of days within which the frequency should be met
     * - **reminder**: Whether to enable reminders for this habit
     * - **notes**: Optional additional notes about the habit
     * - **archived**: Whether the habit is archived
     * - **sort_order**: The order in which the habit appears in lists (ascending)
     * @param habitId
     * @param requestBody
     * @returns HabitRead Successful Response
     * @throws ApiError
     */
    public static patchHabitHabitsHabitIdPatch(
        habitId: number,
        requestBody: HabitUpdate,
    ): CancelablePromise<HabitRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/habits/{habit_id}',
            path: {
                'habit_id': habitId,
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
     * Delete a habit
     * Delete a habit by its ID.
     *
     * - **habit_id**: The unique identifier of the habit to delete
     *
     * This action cannot be undone. All associated tracker entries will also be deleted.
     * @param habitId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteHabitHabitsHabitIdDelete(
        habitId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/habits/{habit_id}',
            path: {
                'habit_id': habitId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * List all trackers for a habit
     * Get all tracker entries for a specific habit, ordered by date (most recent first).
     *
     * - **habit_id**: The unique identifier of the habit
     * - **limit**: Maximum number of trackers to return (default: 5, max: 100)
     *
     * Returns tracker entries showing completion/skip status for each date.
     * @param habitId
     * @param limit Maximum number of trackers to return (1-100)
     * @returns TrackerList Successful Response
     * @throws ApiError
     */
    public static listHabitTrackersHabitsHabitIdTrackersGet(
        habitId: number,
        limit: number = 5,
    ): CancelablePromise<TrackerList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/habits/{habit_id}/trackers',
            path: {
                'habit_id': habitId,
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
    /**
     * List trackers in lightweight format
     * Get tracker entries in a lightweight format with date-based pagination.
     *
     * This endpoint returns only the essential fields:
     * - id: Tracker ID (for fetching full details if needed)
     * - dated: The date of the tracker entry
     * - status: 0=not completed, 1=skipped, 2=completed
     * - has_note: Whether this tracker has a note attached
     *
     * Use this for calendar views and streak calculations. Use the full trackers
     * endpoint or fetch individual trackers when you need notes or timestamps.
     *
     * - **habit_id**: The unique identifier of the habit
     * - **end_date**: End date for the range (defaults to today)
     * - **days**: Number of days to fetch (default: 42 = 6 weeks)
     * @param habitId
     * @param endDate End date for the date range (defaults to today). Format: YYYY-MM-DD
     * @param days Number of days to fetch (1-365, default: 42 = 6 weeks)
     * @returns TrackerLiteList Successful Response
     * @throws ApiError
     */
    public static listHabitTrackersLiteHabitsHabitIdTrackersLiteGet(
        habitId: number,
        endDate?: (string | null),
        days: number = 42,
    ): CancelablePromise<TrackerLiteList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/habits/{habit_id}/trackers/lite',
            path: {
                'habit_id': habitId,
            },
            query: {
                'end_date': endDate,
                'days': days,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
