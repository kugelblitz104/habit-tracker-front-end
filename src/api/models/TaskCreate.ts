/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TaskCreate = {
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
    estimated_effort?: (number | null);
    project_id?: (number | null);
    parent_id?: (number | null);
};

