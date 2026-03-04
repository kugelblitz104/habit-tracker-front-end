import { ImportService, type ImportResult } from '@/api';

/**
 * Export all user habits to a Loop Habit Tracker compatible database file.
 * The backend returns the SQLite file as base64-encoded JSON (ExportResult),
 * which we decode and trigger as a browser download.
 * @param includeArchived Whether to include archived habits
 */
export const exportHabits = async (includeArchived = false): Promise<void> => {
    const result = await ImportService.exportToLoopHabitTrackerImportLoopHabitTrackerGet(
        includeArchived
    );

    // Decode base64 string to raw bytes
    const binary = atob(result.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: result.content_type ?? 'application/x-sqlite3' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};

/**
 * Import habits from a Loop Habit Tracker compatible database file
 * @param file The .db file to import
 */
export const importHabits = async (file: File): Promise<ImportResult> => {
    try {
        if (!file.name.endsWith('.db')) {
            throw new Error('File must be a Loop Habit Tracker .db file');
        }

        return await ImportService.importFromLoopHabitTrackerImportLoopHabitTrackerPost({
            file: file
        });
    } catch (error) {
        throw new Error(`Failed to import habits: ${error}`);
    }
};
