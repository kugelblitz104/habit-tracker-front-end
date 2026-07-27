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

/** Stringify a plain JSON object and trigger a browser download. */
const downloadJson = (data: unknown, filename: string): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};

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
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(backup, `habit-tracker-${slugify(profileName)}-${stamp}.json`);
};

/** The per-entity arrays a profile backup carries, keyed for slicing. */
export type BackupEntity =
    | 'projects'
    | 'tasks'
    | 'countdowns'
    | 'time_entries'
    | 'habits'
    | 'trackers'
    | 'calendar_connections'
    | 'integration_connections';

/**
 * Export a single entity type of a profile as JSON. Reuses the full-backup
 * endpoint (one source of truth, and — unlike the paged list endpoints — no
 * 100-row cap) and slices out the requested array. The result is a snapshot
 * for portability/inspection; whole-profile round-trip import stays on the
 * Full Backup card. Returns the row count for the caller's toast.
 */
export const exportProfileEntity = async (
    profileId: number,
    profileName: string,
    entity: BackupEntity
): Promise<number> => {
    const backup = await BackupService.exportProfileBackupBackupProfilesProfileIdGet(
        profileId
    );
    const rows = (backup[entity] ?? []) as unknown[];
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(
        {
            format: `habit-tracker-${entity.replace(/_/g, '-')}-export`,
            exported_at: backup.exported_at,
            profile: backup.profile.name,
            count: rows.length,
            [entity]: rows
        },
        `habit-tracker-${slugify(profileName)}-${entity.replace(/_/g, '-')}-${stamp}.json`
    );
    return rows.length;
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
