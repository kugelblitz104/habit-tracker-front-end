/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HabitTrackersLite } from './HabitTrackersLite';
/**
 * Lightweight trackers for a page of a profile's habits.
 *
 * Paging is over HABITS, not trackers: each entry holds every tracker in
 * the window for its habit, which is what lets a caller treat an entry as
 * self-contained. `total` is the habit match count.
 */
export type HabitTrackersLiteList = {
    items?: Array<HabitTrackersLite>;
    total: number;
    limit: number;
    offset: number;
};

