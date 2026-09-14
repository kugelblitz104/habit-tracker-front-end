/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TrackerCreate } from '../models/TrackerCreate';
import type { TrackerList } from '../models/TrackerList';
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
     * - **status**: 0=not completed, 1=skipped, 2=completed
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
     * List tracker entries for a profile
     * Get a paginated list of tracker entries across every habit in a profile,
     * most recent date first.
     *
     * The per-habit endpoints under /habits/{habit_id}/trackers answer "this
     * habit's history"; this one answers "what was recorded over these days",
     * which otherwise costs one request per habit.
     *
     * - **profile_id**: The profile whose trackers to list (required)
     * - **dated_from**: Optional. Entries on or after this local date
     * - **dated_to**: Optional. Entries on or before this local date
     * - **limit**: Maximum number of entries to return (default: 100, max: 100)
     * - **offset**: Number of entries to skip (default: 0)
     * @param profileId The profile whose trackers to list
     * @param datedFrom Only entries dated on or after this local date
     * @param datedTo Only entries dated on or before this local date. Inclusive, unlike the instant filters elsewhere: dated is a date, so one day is the same value in both bounds.
     * @param limit Maximum number of entries to return (1-100)
     * @param offset Number of entries to skip
     * @returns TrackerList Successful Response
     * @throws ApiError
     */
    public static listTrackersTrackersGet(
        profileId: number,
        datedFrom?: (string | null),
        datedTo?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<TrackerList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/trackers/',
            query: {
                'profile_id': profileId,
                'dated_from': datedFrom,
                'dated_to': datedTo,
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
     * Delete all trackers in a profile
     * Delete every tracker entry belonging to a profile's habits, keeping the
     * habits themselves.
     *
     * - **profile_id**: The profile whose trackers to delete (required)
     *
     * This action cannot be undone.
     * @param profileId The profile whose trackers to delete
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteAllTrackersTrackersDelete(
        profileId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/trackers/',
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
     * - **status**: 0=not completed, 1=skipped, 2=completed
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
