/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TaskRead = {
    profile_id: number;
    title: string;
    notes?: (string | null);
    priority?: number;
    due_date?: (string | null);
    due_time?: (string | null);
    scheduled_date?: (string | null);
    scheduled_time?: (string | null);
    status?: number;
    block_reason?: (string | null);
    external_ref?: (string | null);
    external_url?: (string | null);
    project_id?: (number | null);
    id: number;
    closed_date?: (string | null);
    created_date: string;
    updated_date?: (string | null);
    band?: string;
};

