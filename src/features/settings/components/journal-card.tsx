import type { ProfileRead, ProfileUpdate } from '@/api';
import { EmberToggle } from '@/components/ui/forms/ember-toggle';
import {
    fieldLabelClass,
    fieldLabelStyle,
    themedInputClass,
    themedInputStyle
} from '@/components/ui/forms/input-styles';
import { useUpdateProfile } from '@/features/profiles/api/update-profiles';
import { apiErrorMessage } from '@/lib/api-error-message';
import { useEffect, useState } from 'react';
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
                className={`flex items-center justify-between gap-4 border-t pt-3.5 ${subordinateClass}`}
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
        </SettingsCard>
    );
};
