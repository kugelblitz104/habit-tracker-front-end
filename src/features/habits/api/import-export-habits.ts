import { ImportService, type ImportResult } from '@/api';
import { downloadBlob } from '@/lib/download';

/**
 * Export habits to a Loop Habit Tracker compatible database file.
 * The backend returns the SQLite file as base64-encoded JSON (ExportResult),
 * which we decode and trigger as a browser download.
 * @param includeArchived Whether to include archived habits
 * @param profileId Only export this profile's habits (omit for all profiles)
 */
export const exportHabits = async (includeArchived = false, profileId?: number): Promise<void> => {
    const result = await ImportService.exportToLoopHabitTrackerImportLoopHabitTrackerGet(
        includeArchived,
        profileId
    );

    // Decode base64 string to raw bytes
    const binary = atob(result.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: result.content_type ?? 'application/x-sqlite3' });
    downloadBlob(blob, result.filename);
};

/**
 * Import habits from a Loop Habit Tracker compatible database file
 * @param file The .db file to import
 * @param profileId Profile the imported habits belong to (omit for the
 *                  user's oldest profile)
 */
export const importHabits = async (file: File, profileId?: number): Promise<ImportResult> => {
    try {
        if (!file.name.endsWith('.db')) {
            throw new Error('File must be a Loop Habit Tracker .db file');
        }

        return await ImportService.importFromLoopHabitTrackerImportLoopHabitTrackerPost(
            {
                // The generated request model declares `file: Blob`, and a File
                // is a Blob, so it's passed through with no cast needed.
                file
            },
            profileId
        );
    } catch (error) {
        throw new Error(`Failed to import habits: ${error}`);
    }
};
