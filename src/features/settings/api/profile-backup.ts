import { BackupService, type ImportSummary, type ProfileBackup } from '@/api';

/**
 * Full-profile backup helpers. Unlike the Loop Habit Tracker import/export
 * (`import-export-habits.ts`), these round-trip *every* entity of a profile as
 * one JSON document, so a profile can be moved between instances (e.g. the
 * hosted app to an on-prem server). Plain async wrappers over the generated
 * BackupService — the settings card owns loading state + toasts, matching the
 * manage-data card pattern.
 */

const slugify = (name: string): string =>
    name
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'profile';

/**
 * Export a profile as JSON and trigger a browser download. The document is a
 * plain JSON object (no base64), so it's stringified and downloaded directly.
 */
export const exportProfileBackup = async (
    profileId: number,
    profileName: string
): Promise<void> => {
    const backup = await BackupService.exportProfileBackupBackupProfilesProfileIdGet(
        profileId
    );
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json'
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = objectUrl;
    link.download = `habit-tracker-${slugify(profileName)}-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};

/**
 * Read a backup file and import it as a NEW profile owned by the current user.
 * Parses client-side first so an obviously-wrong file fails fast with a clear
 * message rather than a 422 from the server.
 */
export const importProfileBackup = async (file: File): Promise<ImportSummary> => {
    const text = await file.text();
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error(
            "That file isn't valid JSON — choose a backup exported from this app."
        );
    }
    return BackupService.importProfileBackupBackupProfilesPost(parsed as ProfileBackup);
};
