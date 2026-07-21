/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntegrationConnectionCreate = {
    provider: string;
    name: string;
    organization?: (string | null);
    project?: (string | null);
    work_item_type?: (string | null);
    base_url?: (string | null);
    default_repo?: (string | null);
    enabled?: boolean;
    profile_id: number;
    token: string;
};

