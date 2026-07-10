/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalendarConnectionCreate } from '../models/CalendarConnectionCreate';
import type { CalendarConnectionList } from '../models/CalendarConnectionList';
import type { CalendarConnectionRead } from '../models/CalendarConnectionRead';
import type { CalendarConnectionUpdate } from '../models/CalendarConnectionUpdate';
import type { CalendarEventList } from '../models/CalendarEventList';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CalendarConnectionsService {
    /**
     * List calendar connections for a profile
     * Get a paginated list of read-only ICS calendar subscriptions belonging to
     * a profile, ordered by creation date.
     *
     * - **profile_id**: The profile whose connections to list (required)
     * - **limit**: Maximum number of connections to return (default: 100, max: 100)
     * - **offset**: Number of connections to skip (default: 0)
     * @param profileId The profile whose connections to list
     * @param limit Maximum number of connections to return (1-100)
     * @param offset Number of connections to skip
     * @returns CalendarConnectionList Successful Response
     * @throws ApiError
     */
    public static listCalendarConnectionsCalendarConnectionsGet(
        profileId: number,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<CalendarConnectionList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calendar-connections/',
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
     * Create a new calendar connection
     * Subscribe a profile to a read-only ICS calendar feed:
     *
     * - **profile_id**: The ID of the profile this connection belongs to
     * - **name**: Display name for the calendar
     * - **color**: Hex color code for the calendar's events
     * - **url**: The ICS feed URL (http:// or https://)
     * - **provider**: Optional free-form label ("Google", "iCloud", ...)
     * - **enabled**: Whether the calendar's events are included (default: true)
     * @param requestBody
     * @returns CalendarConnectionRead Successful Response
     * @throws ApiError
     */
    public static createCalendarConnectionCalendarConnectionsPost(
        requestBody: CalendarConnectionCreate,
    ): CancelablePromise<CalendarConnectionRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/calendar-connections/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get calendar events for a profile on a day
     * Fetch, cache and parse the profile's enabled ICS calendar feeds and return
     * the normalized events of a single day (recurrences expanded). All-day
     * events come first, then timed events ordered by start time.
     *
     * Successful fetches are cached for 15 minutes; a failing feed keeps serving
     * its stale cache, is not re-attempted for 5 minutes, and its failure is
     * reported in **errors** ("Name: HTTP 404") instead of failing the whole
     * response.
     *
     * - **profile_id**: The profile whose calendar events to list (required)
     * - **target_date**: The day to list events for, YYYY-MM-DD (default: today)
     * - **tz**: Optional IANA timezone for day boundaries (invalid name -> 422)
     * @param profileId The profile whose calendar events to list
     * @param targetDate The day to list events for (default: today)
     * @param tz IANA timezone name (e.g. 'America/New_York'). When provided, the day runs from midnight to midnight in this zone and the default target_date is today in this zone; when omitted, day boundaries are interpreted in each feed's own timezone (legacy behavior).
     * @returns CalendarEventList Successful Response
     * @throws ApiError
     */
    public static listCalendarEventsCalendarConnectionsEventsGet(
        profileId: number,
        targetDate?: (string | null),
        tz?: (string | null),
    ): CancelablePromise<CalendarEventList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calendar-connections/events',
            query: {
                'profile_id': profileId,
                'target_date': targetDate,
                'tz': tz,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a calendar connection by ID
     * Retrieve a specific calendar connection by its ID.
     *
     * - **connection_id**: The unique identifier of the connection to retrieve
     * @param connectionId
     * @returns CalendarConnectionRead Successful Response
     * @throws ApiError
     */
    public static readCalendarConnectionCalendarConnectionsConnectionIdGet(
        connectionId: number,
    ): CancelablePromise<CalendarConnectionRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calendar-connections/{connection_id}',
            path: {
                'connection_id': connectionId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a calendar connection (partial update)
     * Update specific fields of a calendar connection. Only provided fields are
     * updated. Changing **url** clears the cached feed so the next events call
     * fetches the new address.
     *
     * You can update any combination of these fields:
     * - **name**: Display name for the calendar
     * - **color**: Hex color code for the calendar's events
     * - **url**: The ICS feed URL (http:// or https://)
     * - **provider**: Optional free-form label
     * - **enabled**: Whether the calendar's events are included
     * @param connectionId
     * @param requestBody
     * @returns CalendarConnectionRead Successful Response
     * @throws ApiError
     */
    public static patchCalendarConnectionCalendarConnectionsConnectionIdPatch(
        connectionId: number,
        requestBody: CalendarConnectionUpdate,
    ): CancelablePromise<CalendarConnectionRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/calendar-connections/{connection_id}',
            path: {
                'connection_id': connectionId,
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
     * Delete a calendar connection
     * Delete a calendar connection by its ID. This only removes the
     * subscription; the remote calendar is never modified.
     *
     * - **connection_id**: The unique identifier of the connection to delete
     * @param connectionId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteCalendarConnectionCalendarConnectionsConnectionIdDelete(
        connectionId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/calendar-connections/{connection_id}',
            path: {
                'connection_id': connectionId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
