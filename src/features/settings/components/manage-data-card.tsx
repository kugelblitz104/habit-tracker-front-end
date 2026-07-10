import { exportHabits, importHabits } from '@/features/habits/api/import-export-habits';
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
 * MANAGE DATA card: Loop Habit Tracker .db import (hidden file input) and
 * export. Handlers carried over verbatim from the old settings page.
 */
export const ManageDataCard = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleExportHabits = async () => {
        setIsExporting(true);
        try {
            await exportHabits(false);
            toast.success('Habits exported successfully');
        } catch (error) {
            toast.error(`Failed to export habits: ${error}`);
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
            const result = await importHabits(file);
            if (result.success) {
                toast.success(
                    `Imported ${result.habits_imported} habits and ${result.trackers_imported} trackers`
                );
            } else {
                toast.warning(`Import completed with issues: ${result.message}`);
            }

            if (result.errors && result.errors.length > 0) {
                result.errors.forEach((error) => {
                    toast.error(error);
                });
            }
        } catch (error) {
            toast.error(`Failed to import habits: ${error}`);
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <SettingsCard label='Manage data' labelGapClass='mb-3.5'>
            <div className='flex flex-wrap gap-2.5'>
                <button
                    type='button'
                    onClick={handleImportClick}
                    disabled={isImporting || isExporting}
                    className={dataButtonClass}
                    style={dataButtonStyle}
                >
                    <Upload size={14} />
                    Import data
                </button>
                <button
                    type='button'
                    onClick={handleExportHabits}
                    disabled={isExporting || isImporting}
                    className={dataButtonClass}
                    style={dataButtonStyle}
                >
                    <Download size={14} />
                    Export data
                </button>
            </div>
            <input
                ref={fileInputRef}
                type='file'
                accept='.db'
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label='Import habits database file'
            />
        </SettingsCard>
    );
};
