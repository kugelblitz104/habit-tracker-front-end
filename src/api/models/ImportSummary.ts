/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Per-entity counts of what an import created, plus any warnings.
 */
export type ImportSummary = {
    success: boolean;
    profile_id: number;
    profile_name: string;
    projects_imported?: number;
    tasks_imported?: number;
    subtasks_imported?: number;
    countdowns_imported?: number;
    time_entries_imported?: number;
    habits_imported?: number;
    trackers_imported?: number;
    calendar_connections_imported?: number;
    integration_connections_imported?: number;
    warnings?: Array<string>;
};

