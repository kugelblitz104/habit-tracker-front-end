/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskCreate } from '../models/TaskCreate';
import type { TaskList } from '../models/TaskList';
import type { TaskRead } from '../models/TaskRead';
import type { TaskUpdate } from '../models/TaskUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TasksService {
    /**
     * List tasks for a profile
     * Get a paginated list of tasks belonging to a profile. Each task carries
     * its computed urgency **band** (now/soon/whenever/hidden).
     *
     * - **profile_id**: The profile whose tasks to list (required)
     * - **project_id**: Optional. Only tasks in this project
     * - **band**: Optional. Filter by computed band. Bands are date-relative,
     * so this filter is applied after fetching the profile's tasks
     * - **status**: Optional. Filter by exact task status value
     * - **include_closed**: Include done/cancelled tasks (default: false). For
     * the "Completed & closed" view pass `include_closed=true&band=hidden` -
     * that view is ordered by closed date (most recent first)
     * - **limit**: Maximum number of tasks to return (default: 100, max: 100)
     * - **offset**: Number of tasks to skip (default: 0)
     *
     * Active tasks are ordered by priority (desc), due date (asc, no due date
     * last), then creation date (asc).
     * @param profileId The profile whose tasks to list
     * @param projectId Only tasks in this project
     * @param band Only tasks in this computed band (now, soon, whenever, hidden)
     * @param status Only tasks with this status value
     * @param includeClosed Include done/cancelled tasks (excluded by default)
     * @param limit Maximum number of tasks to return (1-100)
     * @param offset Number of tasks to skip
     * @returns TaskList Successful Response
     * @throws ApiError
     */
    public static listTasksTasksGet(
        profileId: number,
        projectId?: (number | null),
        band?: (string | null),
        status?: (number | null),
        includeClosed: boolean = false,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<TaskList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tasks/',
            query: {
                'profile_id': profileId,
                'project_id': projectId,
                'band': band,
                'status': status,
                'include_closed': includeClosed,
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
     * Create a new task
     * Create a new task. Quick-capture friendly: only **profile_id** and
     * **title** are required, everything else is defaulted.
     *
     * - **profile_id**: The ID of the profile this task belongs to
     * - **title**: Title of the task
     * - **notes**: Optional markdown notes about the task
     * - **priority**: 0 none / 1 low / 2 medium / 3 high (default: 0)
     * - **due_date**: Optional due date
     * - **due_time**: Optional due time
     * - **scheduled_date**: Optional date the task is scheduled for
     * - **scheduled_time**: Optional time the task is scheduled for
     * - **status**: Task status value (default: 0 = open)
     * - **block_reason**: Optional free-text reason when blocked
     * - **external_ref**: Optional external reference (e.g. "ADO-2841")
     * - **external_url**: Optional external URL
     * - **project_id**: Optional project (must belong to the same profile)
     *
     * Scheduled data only lives on SCHEDULED tasks: if the created status is
     * anything other than SCHEDULED, scheduled_date/scheduled_time are forced to
     * null even when supplied (prevents orphaned scheduled data).
     * @param requestBody
     * @returns TaskRead Successful Response
     * @throws ApiError
     */
    public static createTaskTasksPost(
        requestBody: TaskCreate,
    ): CancelablePromise<TaskRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tasks/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Export a profile's tasks as Markdown
     * Export all of a profile's tasks as a Markdown document (`text/markdown`).
     * The response body is the raw document - not JSON-wrapped - so the client
     * can save it directly as a `.md` file.
     *
     * - **profile_id**: The profile whose tasks to export (required)
     *
     * Tasks are grouped by computed urgency band (Now / Soon / Whenever, plus a
     * "Completed & cancelled" section for done/cancelled tasks); empty sections
     * are omitted. Each task is a checklist line (`- [x]` when done) with
     * indented detail bullets for the fields that are set. Ordering matches the
     * tasks list endpoint: active bands by priority (desc), due date (asc, no
     * due date last), then creation date; the closed section by closed date
     * (most recent first).
     * @param profileId The profile whose tasks to export
     * @returns string Successful Response
     * @throws ApiError
     */
    public static exportTasksMarkdownTasksExportGet(
        profileId: number,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tasks/export',
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
     * Get a task by ID
     * Retrieve a specific task by its ID, including its computed urgency band.
     *
     * - **task_id**: The unique identifier of the task to retrieve
     * @param taskId
     * @returns TaskRead Successful Response
     * @throws ApiError
     */
    public static readTaskTasksTaskIdGet(
        taskId: number,
    ): CancelablePromise<TaskRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tasks/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a task (partial update)
     * Update specific fields of an existing task. Only provided fields will be updated.
     *
     * - **task_id**: The unique identifier of the task to update
     *
     * You can update any combination of these fields:
     * - **profile_id**: Move the task to another profile (must belong to the same
     * user; the task's project, if any, must belong to the new profile)
     * - **title**: Title of the task
     * - **notes**: Optional markdown notes about the task
     * - **priority**: 0 none / 1 low / 2 medium / 3 high
     * - **due_date**: Optional due date
     * - **due_time**: Optional due time
     * - **scheduled_date**: Optional date the task is scheduled for
     * - **scheduled_time**: Optional time the task is scheduled for
     * - **status**: Task status value. Entering done/cancelled stamps the
     * closed date; reopening to any active status clears it
     * - **block_reason**: Optional free-text reason when blocked
     * - **external_ref**: Optional external reference (e.g. "ADO-2841")
     * - **external_url**: Optional external URL
     * - **project_id**: Optional project (must belong to the task's profile)
     *
     * Scheduled data only lives on SCHEDULED tasks: if the resulting status (the
     * new status if provided, else the existing one) is anything other than
     * SCHEDULED, scheduled_date/scheduled_time are forced to null - even when the
     * scheduled fields themselves were not part of this update (prevents orphaned
     * scheduled data).
     * @param taskId
     * @param requestBody
     * @returns TaskRead Successful Response
     * @throws ApiError
     */
    public static patchTaskTasksTaskIdPatch(
        taskId: number,
        requestBody: TaskUpdate,
    ): CancelablePromise<TaskRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/tasks/{task_id}',
            path: {
                'task_id': taskId,
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
     * Delete a task
     * Delete a task by its ID.
     *
     * - **task_id**: The unique identifier of the task to delete
     *
     * This action cannot be undone.
     * @param taskId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteTaskTasksTaskIdDelete(
        taskId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/tasks/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
