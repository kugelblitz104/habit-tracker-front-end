import type { ProfileRead } from '@/api';
import { useCreateProfile } from '@/features/profiles/api/create-profiles';
import { useDeleteProfile } from '@/features/profiles/api/delete-profiles';
import { ProfileAvatar } from '@/features/profiles/components/profile-avatar';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { useAuth } from '@/lib/auth-context';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
    SettingsCard,
    settingsGhostBorder,
    settingsGhostButtonClass,
    settingsInputClass,
    settingsInputStyle,
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from './settings-card';

const DEFAULT_COLOR_START = '#e0763f';
const DEFAULT_COLOR_END = '#c14e6a';

/** Mono one-liner under the profile name, built from the feature flags. */
const profileSummary = (profile: ProfileRead): string => {
    const parts = [
        `habits ${profile.habits_enabled ? 'on' : 'off'}`,
        `calendar ${profile.calendar_enabled ? 'on' : 'off'}`
    ];
    if (profile.publish_to_azure) {
        parts.push('Azure DevOps');
    }
    return parts.join(' · ');
};

/**
 * PROFILES card: one row per profile (gradient avatar, name, flag summary),
 * the active row warm-tinted with an ACTIVE pill, "Switch" on the others,
 * a per-row delete (never on the active profile) and a dashed "+ New profile"
 * footer that expands into an inline create form.
 */
export const ProfilesCard = () => {
    const { profiles, activeProfileId, setActiveProfileId } = useAuth();

    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColorStart, setNewColorStart] = useState(DEFAULT_COLOR_START);
    const [newColorEnd, setNewColorEnd] = useState(DEFAULT_COLOR_END);

    const resetCreateForm = () => {
        setCreating(false);
        setNewName('');
        setNewColorStart(DEFAULT_COLOR_START);
        setNewColorEnd(DEFAULT_COLOR_END);
    };

    const createProfile = useCreateProfile({
        mutationConfig: {
            onSuccess: (profile) => {
                toast.success(`Profile "${profile.name}" created`);
                resetCreateForm();
            },
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to create profile'));
            }
        }
    });

    const deleteProfile = useDeleteProfile({
        mutationConfig: {
            onSuccess: () => {
                toast.success('Profile deleted');
                setConfirmDeleteId(null);
            },
            // The backend refuses to delete the last profile; surface its message.
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to delete profile'));
                setConfirmDeleteId(null);
            }
        }
    });

    const handleCreate = () => {
        const name = newName.trim();
        if (!name) return;
        createProfile.mutate({
            name,
            color_start: newColorStart,
            color_end: newColorEnd
        });
    };

    return (
        <SettingsCard label='Profiles'>
            <div className='flex flex-col gap-[9px]'>
                {profiles.map((profile) => {
                    const isActive = profile.id === activeProfileId;
                    const isConfirmingDelete = confirmDeleteId === profile.id;

                    return (
                        <div
                            key={profile.id}
                            className='flex items-center gap-[13px] rounded-row border px-[15px] py-[13px]'
                            style={
                                isActive
                                    ? {
                                          backgroundColor: 'rgba(255,120,60,.06)',
                                          borderColor: 'rgba(255,140,60,.2)'
                                      }
                                    : {
                                          backgroundColor: 'rgba(255,255,255,.02)',
                                          borderColor: 'rgba(255,255,255,.07)'
                                      }
                            }
                        >
                            <ProfileAvatar profile={profile} size={34} />
                            <div className='min-w-0 flex-1'>
                                <div
                                    className={`truncate text-[15px] font-semibold ${
                                        isActive ? 'text-text-primary' : 'text-text-secondary'
                                    }`}
                                >
                                    {profile.name}
                                </div>
                                <div className='mt-0.5 truncate font-mono text-[11px] text-text-muted'>
                                    {profileSummary(profile)}
                                </div>
                            </div>

                            {isActive ? (
                                <span
                                    className='rounded-chip px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em]'
                                    style={{
                                        color: 'var(--color-status-duetoday)',
                                        backgroundColor: 'var(--status-duetoday-bg)'
                                    }}
                                >
                                    Active
                                </span>
                            ) : isConfirmingDelete ? (
                                <span className='flex items-center gap-1.5'>
                                    <span className='font-mono text-[11px] text-text-muted'>
                                        Delete?
                                    </span>
                                    <button
                                        type='button'
                                        onClick={() => deleteProfile.mutate(profile.id)}
                                        disabled={deleteProfile.isPending}
                                        className='rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50'
                                        style={{
                                            backgroundColor: 'var(--color-danger-solid)',
                                            color: 'var(--button-primary-text)'
                                        }}
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setConfirmDeleteId(null)}
                                        className={settingsGhostButtonClass}
                                        style={{ borderColor: settingsGhostBorder }}
                                    >
                                        Cancel
                                    </button>
                                </span>
                            ) : (
                                <span className='flex items-center gap-1.5'>
                                    <button
                                        type='button'
                                        onClick={() => setActiveProfileId(profile.id)}
                                        className={settingsGhostButtonClass}
                                        style={{ borderColor: settingsGhostBorder }}
                                    >
                                        Switch
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setConfirmDeleteId(profile.id)}
                                        title={`Delete profile "${profile.name}"`}
                                        aria-label={`Delete profile "${profile.name}"`}
                                        className='rounded-[8px] p-1.5 text-text-faint transition-colors hover:text-danger'
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </span>
                            )}
                        </div>
                    );
                })}

                {creating ? (
                    <div
                        className='rounded-row border border-dashed p-[13px]'
                        style={{ borderColor: 'rgba(255,255,255,.12)' }}
                    >
                        <div className='flex flex-wrap items-end gap-3'>
                            <label className='min-w-[160px] flex-1'>
                                <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                                    Name
                                </span>
                                <input
                                    type='text'
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreate();
                                    }}
                                    placeholder='e.g. Work'
                                    autoFocus
                                    className={settingsInputClass}
                                    style={settingsInputStyle}
                                />
                            </label>
                            <label className='flex flex-col'>
                                <span className='mb-1.5 block text-[11.5px]' style={{ color: '#9a8f81' }}>
                                    Gradient
                                </span>
                                <span className='flex items-center gap-1.5'>
                                    <input
                                        type='color'
                                        value={newColorStart}
                                        onChange={(e) => setNewColorStart(e.target.value)}
                                        aria-label='Gradient start color'
                                        className='h-[38px] w-[38px] cursor-pointer rounded-[9px] border bg-transparent p-0.5'
                                        style={{ borderColor: 'rgba(255,255,255,.1)' }}
                                    />
                                    <input
                                        type='color'
                                        value={newColorEnd}
                                        onChange={(e) => setNewColorEnd(e.target.value)}
                                        aria-label='Gradient end color'
                                        className='h-[38px] w-[38px] cursor-pointer rounded-[9px] border bg-transparent p-0.5'
                                        style={{ borderColor: 'rgba(255,255,255,.1)' }}
                                    />
                                    <span
                                        className='ml-1 inline-block h-[34px] w-[34px] rounded-full'
                                        style={{
                                            background: `linear-gradient(135deg, ${newColorStart}, ${newColorEnd})`
                                        }}
                                        aria-hidden='true'
                                    />
                                </span>
                            </label>
                            <span className='flex items-center gap-1.5'>
                                <button
                                    type='button'
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || createProfile.isPending}
                                    className={settingsPrimaryButtonClass}
                                    style={settingsPrimaryButtonStyle}
                                >
                                    Create profile
                                </button>
                                <button
                                    type='button'
                                    onClick={resetCreateForm}
                                    className={settingsGhostButtonClass}
                                    style={{ borderColor: settingsGhostBorder }}
                                >
                                    Cancel
                                </button>
                            </span>
                        </div>
                    </div>
                ) : (
                    <button
                        type='button'
                        onClick={() => setCreating(true)}
                        className='flex items-center justify-center gap-2 rounded-row border border-dashed p-3 text-[13px] text-text-muted transition-colors hover:text-text-secondary'
                        style={{ borderColor: 'rgba(255,255,255,.12)' }}
                    >
                        <Plus size={15} />
                        New profile
                    </button>
                )}
            </div>
        </SettingsCard>
    );
};
