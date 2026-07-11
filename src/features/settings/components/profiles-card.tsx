import type { ProfileRead } from '@/api';
import { InlineConfirmAction } from '@/components/ui/inline-confirm-action';
import { useCreateProfile } from '@/features/profiles/api/create-profiles';
import { useDeleteProfile } from '@/features/profiles/api/delete-profiles';
import { ProfileAvatar } from '@/features/profiles/components/profile-avatar';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { useAuth } from '@/lib/auth-context';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { NewProfileForm } from './new-profile-form';
import { SettingsCard, settingsGhostBorder, settingsGhostButtonClass } from './settings-card';

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

    const createProfile = useCreateProfile({
        mutationConfig: {
            onSuccess: (profile) => {
                toast.success(`Profile "${profile.name}" created`);
                setCreating(false);
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

    return (
        <SettingsCard label='Profiles'>
            <div className='flex flex-col gap-[9px]'>
                {profiles.map((profile) => {
                    const isActive = profile.id === activeProfileId;

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
                            ) : (
                                <InlineConfirmAction
                                    isConfirming={confirmDeleteId === profile.id}
                                    onConfirm={() => deleteProfile.mutate(profile.id)}
                                    onCancel={() => setConfirmDeleteId(null)}
                                    pending={deleteProfile.isPending}
                                >
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
                                </InlineConfirmAction>
                            )}
                        </div>
                    );
                })}

                {creating ? (
                    <NewProfileForm
                        pending={createProfile.isPending}
                        onCreate={(values) => createProfile.mutate(values)}
                        onCancel={() => setCreating(false)}
                    />
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
