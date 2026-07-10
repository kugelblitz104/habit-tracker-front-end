/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TimeEntryRead = {
    profile_id: number;
    task_id?: (number | null);
    project_id?: (number | null);
    kind?: number;
    label?: (string | null);
    note?: (string | null);
    id: number;
    started_at: string;
    ended_at?: (string | null);
    duration_seconds?: (number | null);
    created_date: string;
    updated_date?: (string | null);
    is_running?: boolean;
};

