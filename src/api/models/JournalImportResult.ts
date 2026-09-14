/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Result of importing an Obsidian daily-notes vault.
 *
 * Its own model rather than ImportResult, whose counts are habit-specific.
 * `warnings` names every file that was skipped or imported degraded, one
 * line each.
 */
export type JournalImportResult = {
    entries_imported: number;
    entries_skipped: number;
    files_failed: number;
    warnings?: Array<string>;
};

