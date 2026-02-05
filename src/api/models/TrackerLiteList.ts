/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TrackerLite } from './TrackerLite';
/**
 * Lightweight tracker list for efficient data fetching with date-based pagination.
 */
export type TrackerLiteList = {
    trackers?: Array<TrackerLite>;
    total: number;
    end_date: string;
    days: number;
    has_previous?: boolean;
};

