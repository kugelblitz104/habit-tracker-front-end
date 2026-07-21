/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CountdownCreate = {
    profile_id: number;
    title: string;
    target_date: string;
    target_time?: (string | null);
    task_id?: (number | null);
    category?: (string | null);
    color?: (string | null);
    repeat?: string;
    show_occurrence?: boolean;
};

