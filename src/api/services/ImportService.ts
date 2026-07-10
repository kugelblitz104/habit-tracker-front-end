/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_from_loop_habit_tracker_import_loop_habit_tracker_post } from '../models/Body_import_from_loop_habit_tracker_import_loop_habit_tracker_post';
import type { ExportResult } from '../models/ExportResult';
import type { ImportResult } from '../models/ImportResult';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ImportService {
    /**
     * Import habits from Loop Habit Tracker
     * Import habits and their tracking history from a Loop Habit Tracker database file.
     *
     * The file should be a SQLite .db file exported from Loop Habit Tracker app.
     *
     * **Mapping from Loop Habit Tracker to this app:**
     * - `name` → `name`
     * - `question` → `question` (or generated from name if empty)
     * - `color` → `color` (mapped from index to hex)
     * - `freq_num` → `frequency`
     * - `freq_den` → `range`
     * - `archived` → `archived`
     * - `position` → `sort_order`
     * - Repetitions `value` → Tracker `status` (1 = skipped, 2 = completed)
     * - Repetitions `notes` → Tracker `note`
     * @param formData
     * @returns ImportResult Successful Response
     * @throws ApiError
     */
    public static importFromLoopHabitTrackerImportLoopHabitTrackerPost(
        formData: Body_import_from_loop_habit_tracker_import_loop_habit_tracker_post,
    ): CancelablePromise<ImportResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/import/loop-habit-tracker',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Export habits to Loop Habit Tracker format
     * Export habits and their tracking history to a Loop Habit Tracker compatible database file.
     *
     * Returns a SQLite .db file that can be imported into Loop Habit Tracker app.
     *
     * **Query Parameters:**
     * - `include_archived`: Whether to include archived habits (default: False)
     *
     * **Mapping from this app to Loop Habit Tracker:**
     * - `name` → `name`
     * - `question` → `question`
     * - `color` (#hex) → `color` (0-19 index)
     * - `frequency` → `freq_num`
     * - `range` → `freq_den`
     * - `archived` → `archived`
     * - `sort_order` → `position`
     * - `notes` → `description`
     * - Tracker `status` → Repetition `value` (1 = skipped, 2 = completed)
     * - Tracker `note` → Repetition `notes`
     * @param includeArchived
     * @returns ExportResult Successful Response
     * @throws ApiError
     */
    public static exportToLoopHabitTrackerImportLoopHabitTrackerGet(
        includeArchived: boolean = false,
    ): CancelablePromise<ExportResult> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/import/loop-habit-tracker',
            query: {
                'include_archived': includeArchived,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
