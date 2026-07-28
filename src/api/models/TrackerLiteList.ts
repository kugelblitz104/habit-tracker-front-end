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
    /**
     * Dates in the returned range that are auto-skipped: the habit's frequency goal was already met earlier in the range window, so no action was needed. A LIST-level field, not a TrackerLite one - an auto-skipped day usually has no tracker row at all. Computed server-side against full history, so callers never need to fetch a wider window than they render. Reported as the raw date-level predicate: a date can appear here AND have a tracker row, and consumers should let an explicit completed/skipped row win.
     */
    auto_skipped_dates?: Array<string>;
};

