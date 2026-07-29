import {
    exportProfileBackup,
    importProfileBackup
} from '@/features/settings/api/profile-backup';
import { apiErrorMessage } from '@/lib/api-error-message';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

const dataButtonClass =
    'inline-flex items-center gap-2 rounded-[9px] border px-[15px] py-[9px] text-[13px] ' +
    'text-text-secondary transition-colors hover:text-text-primary ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

const dataButtonStyle = {
    backgroundColor: 'rgba(255,255,255,.05)',
    borderColor: 'rgba(255,255,255,.12)'
} as const;

/**
 * FULL BACKUP card: export the active profile (with every entity — projects,
 * tasks, countdowns, time entries, habits, trackers, calendars, integrations)
 * as one JSON file, and import such a file back as a NEW profile. This is the
 * portable path for moving a profile between instances (e.g. the hosted app to
 * an on-prem server); import never overwrites existing data.
 */
export const FullBackupCard = () => {
    const { activeProfile, setActiveProfileId } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleExport = async () => {
        if (!activeProfile) return;
        setIsExporting(true);
        try {
            await exportProfileBackup(activeProfile.id, activeProfile.name);
            toast.success(`Exported "${activeProfile.name}" backup`);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to export backup'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const summary = await importProfileBackup(file);
            const counts = [
                `${(summary.tasks_imported ?? 0) + (summary.subtasks_imported ?? 0)} tasks`,
                `${summary.habits_imported ?? 0} habits`,
                `${summary.projects_imported ?? 0} projects`,
                `${summary.time_entries_imported ?? 0} time entries`,
                `${summary.countdowns_imported ?? 0} countdowns`
            ].join(', ');
            toast.success(`Imported "${summary.profile_name}" — ${counts}`);
            (summary.warnings ?? []).forEach((warning) => toast.warning(warning));

            // A full-profile import touches every cache and adds a profile;
            // drop all caches and switch to the freshly-imported profile.
            await queryClient.invalidateQueries();
            setActiveProfileId(summary.profile_id);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to import backup'));
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <SettingsCard label='Full backup' labelGapClass='mb-3.5'>
            <div className='mb-3 text-[12px]' style={{ color: '#9a8f81' }}>
                Export this profile&apos;s complete data as a JSON file, or import
                one as a new profile. Use it to move a profile between servers.
                Integration access tokens aren&apos;t included &mdash; re-enter them
                after importing.
            </div>
            <div className='flex flex-wrap gap-2.5'>
                <button
                    type='button'
                    onClick={handleImportClick}
                    disabled={isImporting || isExporting}
                    className={dataButtonClass}
                    style={dataButtonStyle}
                >
                    <Upload size={14} />
                    Import backup
                </button>
                <button
                    type='button'
                    onClick={handleExport}
                    disabled={isExporting || isImporting || !activeProfile}
                    className={dataButtonClass}
                    style={dataButtonStyle}
                >
                    <Download size={14} />
                    Export backup
                </button>
            </div>
            <input
                ref={fileInputRef}
                type='file'
                accept='.json,application/json'
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label='Import profile backup JSON file'
            />
        </SettingsCard>
    );
};
