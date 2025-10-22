/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TrackerCreate } from '../models/TrackerCreate';
import type { TrackerRead } from '../models/TrackerRead';
import type { TrackerUpdate } from '../models/TrackerUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TrackersService {
    /**
     * Create a new tracker entry
     * Create a new tracker entry to record habit completion or skip for a specific date.
     *
     * - **habit_id**: The ID of the habit being tracked
     * - **dated**: The date for this tracker entry
     * - **completed**: Whether the habit was completed on this date
     * - **skipped**: Whether the habit was skipped on this date
     * - **note**: Optional note about this entry
     * @param requestBody
     * @returns TrackerRead Successful Response
     * @throws ApiError
     */
    public static createTrackerTrackersPost(
        requestBody: TrackerCreate,
    ): CancelablePromise<TrackerRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/trackers/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a tracker entry by ID
     * Retrieve a specific tracker entry by its ID.
     *
     * - **tracker_id**: The unique identifier of the tracker entry to retrieve
     * @param trackerId
     * @returns TrackerRead Successful Response
     * @throws ApiError
     */
    public static readTrackerTrackersTrackerIdGet(
        trackerId: number,
    ): CancelablePromise<TrackerRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/trackers/{tracker_id}',
            path: {
                'tracker_id': trackerId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Replace a tracker entry (full update)
     * Replace all fields of an existing tracker entry. All fields must be provided.
     *
     * This performs a full replacement of the tracker resource.
     * Use PATCH if you want to update only specific fields.
     *
     * - **tracker_id**: The unique identifier of the tracker entry to update
     * @param trackerId
     * @param requestBody
     * @returns TrackerRead Successful Response
     * @throws ApiError
     */
    public static updateTrackerTrackersTrackerIdPut(
        trackerId: number,
        requestBody: TrackerUpdate,
    ): CancelablePromise<TrackerRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/trackers/{tracker_id}',
            path: {
                'tracker_id': trackerId,
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
     * Update a tracker entry (partial update)
     * Update specific fields of an existing tracker entry. Only provided fields will be updated.
     *
     * This performs a partial update of the tracker resource.
     * Use PUT if you want to replace the entire resource.
     *
     * - **tracker_id**: The unique identifier of the tracker entry to update
     *
     * You can update any combination of these fields:
     * - **dated**: The date for this tracker entry
     * - **completed**: Whether the habit was completed on this date
     * - **skipped**: Whether the habit was skipped on this date
     * - **note**: Optional note about this entry
     * @param trackerId
     * @param requestBody
     * @returns TrackerRead Successful Response
     * @throws ApiError
     */
    public static patchTrackerTrackersTrackerIdPatch(
        trackerId: number,
        requestBody: TrackerUpdate,
    ): CancelablePromise<TrackerRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/trackers/{tracker_id}',
            path: {
                'tracker_id': trackerId,
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
     * Delete a tracker entry
     * Delete a tracker entry by its ID.
     *
     * - **tracker_id**: The unique identifier of the tracker entry to delete
     *
     * This action cannot be undone.
     * @param trackerId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTrackerTrackersTrackerIdDelete(
        trackerId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/trackers/{tracker_id}',
            path: {
                'tracker_id': trackerId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
