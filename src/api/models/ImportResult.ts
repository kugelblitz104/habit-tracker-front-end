/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportedHabitSummary } from './ImportedHabitSummary';
/**
 * Result of a database import operation
 */
export type ImportResult = {
    success: boolean;
    message: string;
    habits_imported: number;
    trackers_imported: number;
    habits_skipped: number;
    trackers_skipped: number;
    details?: Array<ImportedHabitSummary>;
    errors?: Array<string>;
};

