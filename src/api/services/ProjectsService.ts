/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectCreate } from '../models/ProjectCreate';
import type { ProjectList } from '../models/ProjectList';
import type { ProjectRead } from '../models/ProjectRead';
import type { ProjectUpdate } from '../models/ProjectUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProjectsService {
    /**
     * List projects for a profile
     * Get a paginated list of projects belonging to a profile, ordered by
     * creation date. Each project includes **open_count** (tasks that are not
     * done or cancelled) and **done_count** (tasks that are done) for progress
     * display.
     *
     * - **profile_id**: The profile whose projects to list (required)
     * - **include_archived**: Include archived projects (default: false)
     * - **limit**: Maximum number of projects to return (default: 100, max: 100)
     * - **offset**: Number of projects to skip (default: 0)
     * @param profileId The profile whose projects to list
     * @param includeArchived Include archived projects in the results
     * @param limit Maximum number of projects to return (1-100)
     * @param offset Number of projects to skip
     * @returns ProjectList Successful Response
     * @throws ApiError
     */
    public static listProjectsProjectsGet(
        profileId: number,
        includeArchived: boolean = false,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<ProjectList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/',
            query: {
                'profile_id': profileId,
                'include_archived': includeArchived,
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
     * Create a new project
     * Create a new project with the following information:
     *
     * - **profile_id**: The ID of the profile this project belongs to
     * - **name**: Name of the project
     * - **color**: Hex color code for visual representation
     * - **notes**: Optional markdown notes about the project
     * - **archived**: Whether the project is archived
     * @param requestBody
     * @returns ProjectRead Successful Response
     * @throws ApiError
     */
    public static createProjectProjectsPost(
        requestBody: ProjectCreate,
    ): CancelablePromise<ProjectRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get a project by ID
     * Retrieve a specific project by its ID, including its task counts
     * (**open_count** and **done_count**).
     *
     * - **project_id**: The unique identifier of the project to retrieve
     * @param projectId
     * @returns ProjectRead Successful Response
     * @throws ApiError
     */
    public static readProjectProjectsProjectIdGet(
        projectId: number,
    ): CancelablePromise<ProjectRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{project_id}',
            path: {
                'project_id': projectId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update a project (partial update)
     * Update specific fields of an existing project. Only provided fields will be updated.
     *
     * - **project_id**: The unique identifier of the project to update
     *
     * You can update any combination of these fields:
     * - **profile_id**: Move the project to another profile (must belong to the
     * same user); the project's tasks move with it
     * - **name**: Name of the project
     * - **color**: Hex color code for visual representation
     * - **notes**: Optional markdown notes about the project
     * - **archived**: Whether the project is archived
     * @param projectId
     * @param requestBody
     * @returns ProjectRead Successful Response
     * @throws ApiError
     */
    public static patchProjectProjectsProjectIdPatch(
        projectId: number,
        requestBody: ProjectUpdate,
    ): CancelablePromise<ProjectRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/projects/{project_id}',
            path: {
                'project_id': projectId,
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
     * Delete a project
     * Delete a project by its ID.
     *
     * - **project_id**: The unique identifier of the project to delete
     *
     * This action cannot be undone. Tasks in the project are NOT deleted -
     * they are kept and their project association is cleared.
     * @param projectId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteProjectProjectsProjectIdDelete(
        projectId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/projects/{project_id}',
            path: {
                'project_id': projectId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
