/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimeEntryCreate } from '../models/TimeEntryCreate';
import type { TimeEntryList } from '../models/TimeEntryList';
import type { TimeEntryRead } from '../models/TimeEntryRead';
import type { TimeEntrySummary } from '../models/TimeEntrySummary';
import type { TimeEntryUpdate } from '../models/TimeEntryUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TimeEntriesService {
    /**
     * List time entries for a profile
     * Get a paginated list of time entries belonging to a profile, ordered by
     * start time (most recent first).
     *
     * - **profile_id**: The profile whose time entries to list (required)
     * - **task_id**: Optional. Only entries attached to this task
     * - **project_id**: Optional. Entries for this project — task-attached entries
     * whose task is in the project plus adhoc entries attached to it directly
     * - **kind**: Optional. 0 = stopwatch, 1 = pomodoro
     * - **running**: Optional. true = only running entries, false = only completed
     * - **limit**: Maximum number of entries to return (default: 100, max: 100)
     * - **offset**: Number of entries to skip (default: 0)
     * @param profileId The profile whose time entries to list
     * @param taskId Only entries for this task
     * @param projectId Only entries for this project: task-attached entries whose task belongs to the project, plus adhoc entries attached to it directly
     * @param kind Only entries of this kind (0 stopwatch, 1 pomodoro)
     * @param running Filter to running (true) or completed (false) entries
     * @param limit Maximum number of entries to return (1-100)
     * @param offset Number of entries to skip
     * @returns TimeEntryList Successful Response
     * @throws ApiError
     */
    public static listTimeEntriesTimeEntriesGet(
        profileId: number,
        taskId?: (number | null),
        projectId?: (number | null),
        kind?: (number | null),
        running?: (boolean | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<TimeEntryList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/time-entries/',
            query: {
                'profile_id': profileId,
                'task_id': taskId,
                'project_id': projectId,
                'kind': kind,
                'running': running,
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
     * Create a time entry
     * Create a time entry. Two shapes:
     *
     * - **Start a timer**: omit both timestamps (or provide only started_at) and
     * leave ended_at null. The entry runs until stopped. Only one timer may run
     * per profile at a time - starting another returns 409.
     * - **Log a completed entry**: provide ended_at (and optionally started_at,
     * default now). duration_seconds is computed from the two, never taken from
     * the client.
     *
     * - **profile_id**: The profile this entry belongs to (required)
     * - **task_id**: Optional task to attach the entry to (same profile). Omit for
     * untethered / adhoc timing
     * - **project_id**: Optional project for adhoc work not tied to a task (same
     * profile). Ignored when task_id is set - a task-attached entry's project is
     * derived from its task
     * - **kind**: 0 = stopwatch (default), 1 = pomodoro
     * - **label**: Optional free-text label ("Standup", "Code review", …)
     * - **note**: Optional free-text note
     * - **started_at**: Optional start time (default: now)
     * - **ended_at**: Optional end time. Present = completed log; absent = running
     * @param requestBody
     * @returns TimeEntryRead Successful Response
     * @throws ApiError
     */
    public static createTimeEntryTimeEntriesPost(
        requestBody: TimeEntryCreate,
    ): CancelablePromise<TimeEntryRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/time-entries/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get the running time entry for a profile
     * Return the profile's currently-running time entry (the one with no
     * ended_at), or null when nothing is running. Powers the Today view's
     * active-timer indicator.
     *
     * - **profile_id**: The profile whose running timer to fetch (required)
     * @param profileId The profile whose running timer to fetch
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readActiveTimeEntryTimeEntriesActiveGet(
        profileId: number,
    ): CancelablePromise<(TimeEntryRead | null)> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/time-entries/active',
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
     * Aggregate tracked time per task for a profile
     * Sum completed tracked time for a profile, bucketed by task and by project.
     * Running entries (no ended_at yet) are excluded - only stopped entries
     * contribute.
     *
     * - **profile_id**: The profile whose time to aggregate (required)
     *
     * Returns **per_task** (null task_id = the task-less/adhoc bucket),
     * **per_project** (each entry's project resolves to its task's project when
     * task-attached, else its direct project_id; null = neither), and the grand
     * **total_seconds**.
     * @param profileId The profile whose time to aggregate
     * @returns TimeEntrySummary Successful Response
     * @throws ApiError
     */
    public static timeEntrySummaryTimeEntriesSummaryGet(
        profileId: number,
    ): CancelablePromise<TimeEntrySummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/time-entries/summary',
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
     * Stop a running time entry
     * Stop a running time entry: stamps ended_at with the server clock and
     * computes duration_seconds. Returns 400 if the entry is already stopped.
     *
     * - **entry_id**: The unique identifier of the entry to stop
     * @param entryId
     * @returns TimeEntryRead Successful Response
     * @throws ApiError
     */
    public static stopTimeEntryTimeEntriesEntryIdStopPost(
        entryId: number,
    ): CancelablePromise<TimeEntryRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/time-entries/{entry_id}/stop',
            path: {
                'entry_id': entryId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a time entry by ID
     * Retrieve a specific time entry by its ID.
     *
     * - **entry_id**: The unique identifier of the entry to retrieve
     * @param entryId
     * @returns TimeEntryRead Successful Response
     * @throws ApiError
     */
    public static readTimeEntryTimeEntriesEntryIdGet(
        entryId: number,
    ): CancelablePromise<TimeEntryRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/time-entries/{entry_id}',
            path: {
                'entry_id': entryId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a time entry (partial update)
     * Update specific fields of a time entry. Only provided fields are updated.
     *
     * - **entry_id**: The unique identifier of the entry to update
     *
     * You can update any combination of these fields:
     * - **task_id**: Attach to a task in the same profile, or null to detach.
     * Setting a task clears any direct project (project derived from the task)
     * - **project_id**: Attach adhoc to a project (same profile), or null to
     * detach. Ignored when a task is attached
     * - **kind**: 0 = stopwatch, 1 = pomodoro
     * - **label**: Free-text label (null to clear)
     * - **note**: Free-text note (null to clear)
     * - **started_at**: Start time
     * - **ended_at**: End time; null reopens the entry as a running timer
     *
     * duration_seconds is always recomputed from the resulting timestamps
     * (null while running). If the update would leave a second running timer in
     * the profile, it returns 409; if ended_at ends up before started_at, 400.
     * @param entryId
     * @param requestBody
     * @returns TimeEntryRead Successful Response
     * @throws ApiError
     */
    public static patchTimeEntryTimeEntriesEntryIdPatch(
        entryId: number,
        requestBody: TimeEntryUpdate,
    ): CancelablePromise<TimeEntryRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/time-entries/{entry_id}',
            path: {
                'entry_id': entryId,
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
     * Delete a time entry
     * Delete a time entry by its ID. This cannot be undone.
     *
     * - **entry_id**: The unique identifier of the entry to delete
     * @param entryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTimeEntryTimeEntriesEntryIdDelete(
        entryId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/time-entries/{entry_id}',
            path: {
                'entry_id': entryId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
