/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntegrationConnectionRead = {
    provider: string;
    name: string;
    organization?: (string | null);
    project?: (string | null);
    work_item_type?: (string | null);
    default_repo?: (string | null);
    enabled?: boolean;
    id: number;
    profile_id: number;
    has_token?: boolean;
    last_synced_at?: (string | null);
    last_error?: (string | null);
    created_date: string;
    updated_date?: (string | null);
};

