/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type HabitRead = {
    name: string;
    question: string;
    color: string;
    frequency: number;
    range: number;
    reminder?: boolean;
    notes?: (string | null);
    archived?: boolean;
    sort_order?: number;
    category?: (string | null);
    profile_id?: (number | null);
    id: number;
    created_date: string;
    updated_date?: (string | null);
    completed_today?: boolean;
    skipped_today?: boolean;
};

