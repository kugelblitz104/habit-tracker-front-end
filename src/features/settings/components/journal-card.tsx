import { ImportService, type ProfileRead, type ProfileUpdate } from '@/api';
import { Button } from '@/components/ui/buttons/button';
import { EmberToggle } from '@/components/ui/forms/ember-toggle';
import {
    fieldLabelClass,
    fieldLabelStyle,
    themedInputClass,
    themedInputStyle
} from '@/components/ui/forms/input-styles';
import { invalidateJournal } from '@/features/journal/api/query-keys';
import { useUpdateProfile } from '@/features/profiles/api/update-profiles';
import { apiErrorMessage } from '@/lib/api-error-message';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

const rowBorderStyle = { borderColor: 'rgba(255,255,255,.06)' } as const;

type JournalCardProps = {
    profile: ProfileRead;
};

/**
 * JOURNAL card: the journal_enabled toggle plus its three subordinate
 * settings (reminder time, custom prompt, gratitude prompt). All three do
 * nothing while the journal is off, so they dim and disable along with it.
 */
export const JournalCard = ({ profile }: JournalCardProps) => {
    const updateProfile = useUpdateProfile({
        mutationConfig: {
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to update profile'));
            }
        }
    });

    const patch = (data: ProfileUpdate, message?: string) =>
        updateProfile.mutate(
            { profileId: profile.id, data },
            message ? { onSuccess: () => toast.success(message) } : undefined
        );

    // Local draft for the free-text prompt: committed on blur rather than per
    // keystroke, and resynced whenever the settings page switches profiles.
    const [promptDraft, setPromptDraft] = useState(profile.journal_prompt ?? '');
    useEffect(() => {
        setPromptDraft(profile.journal_prompt ?? '');
    }, [profile.id, profile.journal_prompt]);

    const enabled = profile.journal_enabled ?? false;
    const subordinateDisabled = !enabled || updateProfile.isPending;
    const subordinateClass = enabled ? '' : 'opacity-50';

    const queryClient = useQueryClient();
    const vaultInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    const importVault = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const result = await ImportService.importJournalFromObsidianImportJournalPost(
                profile.id,
                // The generated request model declares `file: Blob`, and a
                // File is a Blob, so it passes through with no cast.
                { file }
            );
            toast.success(
                `Imported ${result.entries_imported} ${
                    result.entries_imported === 1 ? 'entry' : 'entries'
                }`
            );
            // A run can import nothing and still be a success, so the two
            // ways a note is passed over are reported rather than buried.
            if (result.entries_skipped > 0 || result.files_failed > 0) {
                toast.warning(
                    `${result.entries_skipped} days already written, ` +
                        `${result.files_failed} files unreadable`
                );
            }
            invalidateJournal(queryClient);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to import the vault'));
        } finally {
            setImporting(false);
            // Lets the same zip be picked again after a failure.
            event.target.value = '';
        }
    };

    return (
        <SettingsCard label='Journal' labelGapClass='mb-1.5'>
            <div className='flex items-center justify-between gap-4 py-3.5'>
                <div>
                    <div className='text-[14.5px] font-medium' style={{ color: '#f0e7db' }}>
                        Daily journal
                    </div>
                    <div className='mt-0.5 text-[12px] text-text-muted'>
                        Show the Journal tab for a per-day prose entry
                    </div>
                </div>
                <EmberToggle
                    checked={enabled}
                    onChange={(value) =>
                        patch(
                            { journal_enabled: value },
                            `Journal ${value ? 'on' : 'off'} for ${profile.name}`
                        )
                    }
                    label={`Daily journal for ${profile.name}`}
                    disabled={updateProfile.isPending}
                />
            </div>

            <div
                className={`flex items-center justify-between gap-4 border-t py-3.5 ${subordinateClass}`}
                style={rowBorderStyle}
            >
                <div>
                    <label
                        htmlFor='journal-prompt-time'
                        className='text-[14.5px] font-medium'
                        style={{ color: '#f0e7db' }}
                    >
                        Reminder time
                    </label>
                    <div className='mt-0.5 text-[12px] text-text-muted'>
                        Nudge to check in once this time has passed today
                    </div>
                </div>
                <input
                    id='journal-prompt-time'
                    type='time'
                    value={(profile.journal_prompt_time ?? '').slice(0, 5)}
                    onChange={(e) => patch({ journal_prompt_time: e.target.value || null })}
                    aria-label='Journal reminder time'
                    disabled={subordinateDisabled}
                    className={themedInputClass}
                    style={{ ...themedInputStyle, width: 120 }}
                />
            </div>

            <div className={`border-t py-3.5 ${subordinateClass}`} style={rowBorderStyle}>
                <label htmlFor='journal-prompt' className={fieldLabelClass} style={fieldLabelStyle}>
                    Writing prompt
                </label>
                <textarea
                    id='journal-prompt'
                    rows={2}
                    value={promptDraft}
                    onChange={(e) => setPromptDraft(e.target.value)}
                    onBlur={() => {
                        const next = promptDraft.trim() || null;
                        if (next === (profile.journal_prompt ?? null)) return;
                        patch({ journal_prompt: next });
                    }}
                    placeholder='Shown above the entry each day. Leave blank for no prompt.'
                    disabled={subordinateDisabled}
                    className={`${themedInputClass} resize-none`}
                    style={themedInputStyle}
                />
            </div>

            <div
                className={`flex items-center justify-between gap-4 border-t py-3.5 ${subordinateClass}`}
                style={rowBorderStyle}
            >
                <div>
                    <div className='text-[14.5px] font-medium' style={{ color: '#f0e7db' }}>
                        Gratitude prompt
                    </div>
                    <div className='mt-0.5 text-[12px] text-text-muted'>
                        Also ask &ldquo;Something you&rsquo;re grateful for?&rdquo; each day
                    </div>
                </div>
                <EmberToggle
                    checked={profile.journal_gratitude_enabled ?? true}
                    onChange={(value) => patch({ journal_gratitude_enabled: value })}
                    label={`Gratitude prompt for ${profile.name}`}
                    disabled={subordinateDisabled}
                />
            </div>

            <div
                className={`flex items-center justify-between gap-4 border-t pt-3.5 ${subordinateClass}`}
                style={rowBorderStyle}
            >
                <div className='min-w-0'>
                    <div className='text-[14.5px] font-medium' style={{ color: '#f0e7db' }}>
                        Import from Obsidian
                    </div>
                    <div className='mt-0.5 text-[12px] text-text-muted'>
                        A zip of a daily-notes folder, one YYYY-MM-DD.md per day. A day that already
                        has an entry is never overwritten.
                    </div>
                </div>
                <Button
                    onClick={() => vaultInputRef.current?.click()}
                    disabled={subordinateDisabled || importing}
                    className='shrink-0'
                >
                    <Upload size={14} />
                    {importing ? 'Importing…' : 'Import'}
                </Button>
                <input
                    ref={vaultInputRef}
                    type='file'
                    accept='.zip,application/zip'
                    onChange={importVault}
                    style={{ display: 'none' }}
                    aria-label='Obsidian daily-notes zip'
                />
            </div>
        </SettingsCard>
    );
};
