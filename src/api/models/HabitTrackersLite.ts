/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TrackerLite } from './TrackerLite';
/**
 * One habit's slice of a profile-wide lightweight tracker read.
 *
 * Carries the same window fields as TrackerLiteList so a caller can treat
 * each entry exactly as it treats the per-habit response.
 */
export type HabitTrackersLite = {
    habit_id: number;
    trackers?: Array<TrackerLite>;
    end_date: string;
    days: number;
    has_previous?: boolean;
    auto_skipped_dates?: Array<string>;
};

