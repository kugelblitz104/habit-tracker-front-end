/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JournalEntryCreate } from '../models/JournalEntryCreate';
import type { JournalEntryList } from '../models/JournalEntryList';
import type { JournalEntryRead } from '../models/JournalEntryRead';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class JournalService {
    /**
     * List journal entries for a profile
     * List a profile's journal entries, newest day first.
     *
     * - **profile_id**: The profile whose entries to list (required)
     * - **from_date**: Only entries on or after this day (optional)
     * - **to_date**: Only entries on or before this day (optional)
     * - **limit**: Maximum entries to return (1-100, default: 100)
     * - **offset**: Number of entries to skip (default: 0)
     * @param profileId The profile whose entries to list
     * @param fromDate Only entries on or after this day
     * @param toDate Only entries on or before this day
     * @param limit
     * @param offset
     * @returns JournalEntryList Successful Response
     * @throws ApiError
     */
    public static listJournalEntriesJournalGet(
        profileId: number,
        fromDate?: (string | null),
        toDate?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<JournalEntryList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/journal/',
            query: {
                'profile_id': profileId,
                'from_date': fromDate,
                'to_date': toDate,
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
     * Delete every journal entry in a profile
     * Delete all of a profile's journal entries. This cannot be undone.
     * @param profileId The profile whose entries to delete
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteAllJournalEntriesJournalDelete(
        profileId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/journal/',
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
     * Get the journal entry for one day
     * Retrieve one day's journal entry.
     *
     * - **entry_date**: The day, YYYY-MM-DD
     * - **profile_id**: The profile the day belongs to (required)
     *
     * Returns 404 when the day has no entry, which is how a client tells an
     * unwritten day from a written one.
     * @param entryDate
     * @param profileId The profile the day belongs to
     * @returns JournalEntryRead Successful Response
     * @throws ApiError
     */
    public static readJournalEntryJournalEntryDateGet(
        entryDate: string,
        profileId: number,
    ): CancelablePromise<JournalEntryRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/journal/{entry_date}',
            path: {
                'entry_date': entryDate,
            },
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
     * Create or update one day's journal entry
     * Create or update the journal entry for one day.
     *
     * - **entry_date**: The day, YYYY-MM-DD, taken from the path. Any
     * `entry_date` in the body is ignored.
     *
     * Returns 201 when the day had no entry, 200 when it did.
     * @param entryDate
     * @param requestBody
     * @returns JournalEntryRead Successful Response
     * @returns any A new entry was created for this day
     * @throws ApiError
     */
    public static upsertJournalEntryJournalEntryDatePut(
        entryDate: string,
        requestBody: JournalEntryCreate,
    ): CancelablePromise<JournalEntryRead | any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/journal/{entry_date}',
            path: {
                'entry_date': entryDate,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                409: `The entry could not be saved`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete one day's journal entry
     * Delete one day's journal entry. This cannot be undone.
     * @param entryDate
     * @param profileId The profile the day belongs to
     * @returns void
     * @throws ApiError
     */
    public static deleteJournalEntryJournalEntryDateDelete(
        entryDate: string,
        profileId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/journal/{entry_date}',
            path: {
                'entry_date': entryDate,
            },
            query: {
                'profile_id': profileId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
