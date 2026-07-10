import { AppHeader } from '@/components/layouts/app-header';
import { AccountCard } from '@/features/settings/components/account-card';
import { ConnectionsCard } from '@/features/settings/components/connections-card';
import { DangerZoneCard } from '@/features/settings/components/danger-zone-card';
import { ManageDataCard } from '@/features/settings/components/manage-data-card';
import { ProfilePreferencesCard } from '@/features/settings/components/profile-preferences-card';
import { ProfilesCard } from '@/features/settings/components/profiles-card';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { useState } from 'react';

/**
 * Settings, ember-style: one card per section (Profiles, Profile preferences,
 * Account, Connections, Manage data, Danger zone) in a narrow centered column
 * under the shared AppHeader.
 *
 * Profile scoping: the "Editing …" pill on Profile preferences selects a
 * single profile that BOTH the preferences card and the Calendars subgroup of
 * Connections operate on (defaults to the active profile).
 */
export const SettingsPage = () => {
    const { user, profiles, activeProfile } = useAuth();

    // Which profile the preferences + calendar-connections cards edit. Falls
    // back to the active profile until a selection is made (or if the selected
    // profile gets deleted).
    const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
    const editingProfile =
        profiles.find((p) => p.id === editingProfileId) ?? activeProfile;

    const sublineParts = [
        `${profiles.length} ${profiles.length === 1 ? 'profile' : 'profiles'}`,
        user?.email
    ].filter(Boolean);

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <div className='mx-auto max-w-[820px]'>
                    <header className='mb-[22px]'>
                        <h1 className='font-display text-[24px] font-bold tracking-[-0.01em] text-text-primary'>
                            Settings
                        </h1>
                        <p className='mt-0.5 font-mono text-[12px] text-text-muted'>
                            {sublineParts.join(' · ')}
                        </p>
                    </header>

                    <div className='flex flex-col gap-3.5'>
                        <ProfilesCard />
                        {editingProfile && (
                            <ProfilePreferencesCard
                                profile={editingProfile}
                                profiles={profiles}
                                onSelectProfile={setEditingProfileId}
                            />
                        )}
                        <AccountCard />
                        {editingProfile && <ConnectionsCard profile={editingProfile} />}
                        <ManageDataCard />
                        <DangerZoneCard />
                    </div>
                </div>
            </div>
        </div>
    );
};
