/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IntegrationConnectionCreate } from '../models/IntegrationConnectionCreate';
import type { IntegrationConnectionList } from '../models/IntegrationConnectionList';
import type { IntegrationConnectionRead } from '../models/IntegrationConnectionRead';
import type { IntegrationConnectionUpdate } from '../models/IntegrationConnectionUpdate';
import type { IntegrationSyncResult } from '../models/IntegrationSyncResult';
import type { PublishRequest } from '../models/PublishRequest';
import type { PublishResult } from '../models/PublishResult';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class IntegrationsService {
    /**
     * List integration connections for a profile
     * @param profileId The profile whose connections to list
     * @param limit
     * @param offset
     * @returns IntegrationConnectionList Successful Response
     * @throws ApiError
     */
    public static listIntegrationConnectionsIntegrationsGet(
        profileId: number,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<IntegrationConnectionList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/integrations/',
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
     * Create an integration connection
     * Connect a profile to Azure DevOps or GitHub with a user-supplied PAT.
     *
     * The PAT is encrypted at rest and never returned by the API. Azure DevOps
     * requires **organization** + **project**; GitHub optionally takes a
     * **default_repo** ("owner/repo") used when publishing.
     * @param requestBody
     * @returns IntegrationConnectionRead Successful Response
     * @throws ApiError
     */
    public static createIntegrationConnectionIntegrationsPost(
        requestBody: IntegrationConnectionCreate,
    ): CancelablePromise<IntegrationConnectionRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/integrations/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get an integration connection by ID
     * @param connectionId
     * @returns IntegrationConnectionRead Successful Response
     * @throws ApiError
     */
    public static readIntegrationConnectionIntegrationsConnectionIdGet(
        connectionId: number,
    ): CancelablePromise<IntegrationConnectionRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/integrations/{connection_id}',
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
     * Update an integration connection
     * Partial update. Provide **token** to rotate the PAT; omit it to leave the
     * stored one unchanged. Provider is immutable.
     * @param connectionId
     * @param requestBody
     * @returns IntegrationConnectionRead Successful Response
     * @throws ApiError
     */
    public static patchIntegrationConnectionIntegrationsConnectionIdPatch(
        connectionId: number,
        requestBody: IntegrationConnectionUpdate,
    ): CancelablePromise<IntegrationConnectionRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/integrations/{connection_id}',
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
     * Delete an integration connection
     * @param connectionId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteIntegrationConnectionIntegrationsConnectionIdDelete(
        connectionId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/integrations/{connection_id}',
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
     * Pull assigned open items into tasks
     * Fetch the current user's open assigned work items / issues and create a
     * task for each. Idempotent: an item already imported into this profile is
     * skipped (no duplicate), so re-syncing is safe. Imported tasks are not kept
     * in sync afterward — this is a one-time pull per item.
     * @param connectionId
     * @returns IntegrationSyncResult Successful Response
     * @throws ApiError
     */
    public static syncIntegrationConnectionIntegrationsConnectionIdSyncPost(
        connectionId: number,
    ): CancelablePromise<IntegrationSyncResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/integrations/{connection_id}/sync',
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
     * Publish a task as a new external item
     * Create a new work item / issue from a task's title + notes, then link the
     * task to it (sets source/external_ref/external_url). One-time create — the
     * task's later state is not pushed. Rejects a task that is already linked.
     * @param connectionId
     * @param requestBody
     * @returns PublishResult Successful Response
     * @throws ApiError
     */
    public static publishTaskIntegrationsConnectionIdPublishPost(
        connectionId: number,
        requestBody: PublishRequest,
    ): CancelablePromise<PublishResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/integrations/{connection_id}/publish',
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
}
