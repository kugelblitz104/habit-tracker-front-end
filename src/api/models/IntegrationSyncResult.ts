/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary of a manual "Sync now" pull of assigned open items into tasks.
 */
export type IntegrationSyncResult = {
    success: boolean;
    message: string;
    tasks_imported?: number;
    tasks_skipped?: number;
    details?: Array<string>;
    errors?: Array<string>;
};

