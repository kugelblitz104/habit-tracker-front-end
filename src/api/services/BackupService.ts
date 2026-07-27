/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportSummary } from '../models/ImportSummary';
import type { ProfileBackup } from '../models/ProfileBackup';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BackupService {
    /**
     * Export a profile and all its data as a portable JSON backup
     * Export the profile's projects, tasks (and subtasks), countdowns, time
     * entries, habits, trackers, calendar connections, and integration
     * connections as one JSON document.
     *
     * Integration access tokens are never exported (they can't be used on another
     * instance); the connection config is exported so it only needs its token
     * re-entered after import.
     * @param profileId
     * @returns ProfileBackup Successful Response
     * @throws ApiError
     */
    public static exportProfileBackupBackupProfilesProfileIdGet(
        profileId: number,
    ): CancelablePromise<ProfileBackup> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/backup/profiles/{profile_id}',
            path: {
                'profile_id': profileId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import a profile backup as a new profile
     * Recreate a backup document as a new profile owned by the current user.
     *
     * A new profile is always created (the imported name is suffixed if the user
     * already has one by that name); nothing existing is overwritten. All foreign
     * keys are remapped to the newly-created rows. Integration connections are
     * imported disabled and tokenless — re-enter their PATs afterward.
     * @param requestBody
     * @returns ImportSummary Successful Response
     * @throws ApiError
     */
    public static importProfileBackupBackupProfilesPost(
        requestBody: ProfileBackup,
    ): CancelablePromise<ImportSummary> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/backup/profiles',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
