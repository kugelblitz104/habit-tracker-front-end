import type { ProfileRead } from '@/api';
import { EmberToggle } from '@/components/ui/forms/ember-toggle';
import { ThemedMenuItems } from '@/components/ui/menu';
import { useUpdateProfile } from '@/features/profiles/api/update-profiles';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { ProfileSelector } from '@/features/settings/components/profile-selector';
import { PomodoroSettingsGroup } from '@/features/time-entries/components/pomodoro-settings-group';
import { Menu, MenuButton, MenuItem } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { SettingsCard } from './settings-card';

const menuItemClass =
    'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] text-text-secondary data-focus:bg-white/5';

type ToggleRowConfig = {
    key:
        | 'habits_enabled'
        | 'countdowns_enabled'
        | 'insights_enabled'
        | 'calendar_enabled'
        | 'publish_to_azure'
        | 'week_start_monday'
        | 'use_habit_color_accent'
        | 'show_estimated_effort';
    title: string;
    description: string;
    /** Assumed value when the profile record predates the flag (server default). */
    defaultOn?: boolean;
};

const TOGGLE_ROWS: ToggleRowConfig[] = [
    {
        key: 'habits_enabled',
        title: 'Habits',
        description: 'Show the daily habits section & habit tracking on this profile'
    },
    {
        key: 'countdowns_enabled',
        title: 'Countdowns',
        description: 'Show the Countdown tab & the deadlines section on Today',
        defaultOn: true
    },
    {
        key: 'insights_enabled',
        title: 'Insights',
        description: 'Show the Insights tab with task, time & habit trends',
        defaultOn: true
    },
    {
        key: 'calendar_enabled',
        title: "Today's schedule",
        description: 'Show read-only calendar events on the Today surface'
    },
    {
        // Functional toggle, but it only flips the profile flag — no sync
        // pipeline exists yet (the Connections card shows a static ADO row).
        key: 'publish_to_azure',
        title: 'Publish tasks to Azure DevOps',
        description: 'Work items sync out to ADO; this app stays the source of truth'
    },
    {
        key: 'week_start_monday',
        title: 'Week starts on Monday',
        description:
            'Habit calendars and weekday charts begin the week on Monday instead of Sunday',
        defaultOn: true
    },
    {
        key: 'use_habit_color_accent',
        title: 'Use habit color as accent',
        description:
            "Color each habit's detail view with that habit's own color instead of the standard cool accent"
    },
    {
        key: 'show_estimated_effort',
        title: 'Estimated effort field',
        description: 'Show an estimated-effort (minutes) field when editing tasks'
    }
];

const LANDING_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'habits', label: 'Habits' }
] as const;

type ProfilePreferencesCardProps = {
    /** The profile being edited (selector default: the active profile). */
    profile: ProfileRead;
    profiles: ProfileRead[];
    onSelectProfile: (profileId: number) => void;
};

/**
 * PROFILE PREFERENCES card: per-profile feature toggles (habits / calendar /
 * publish-to-azure) + the default-landing picker, all persisted via
 * useUpdateProfile. Scoped by the "Editing …" pill top-right.
 */
export const ProfilePreferencesCard = ({
    profile,
    profiles,
    onSelectProfile
}: ProfilePreferencesCardProps) => {
    const updateProfile = useUpdateProfile({
        mutationConfig: {
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to update profile'));
            }
        }
    });

    const handleToggle = (row: ToggleRowConfig, value: boolean) => {
        updateProfile.mutate(
            { profileId: profile.id, data: { [row.key]: value } },
            {
                onSuccess: () =>
                    toast.success(`${row.title} ${value ? 'on' : 'off'} for ${profile.name}`)
            }
        );
    };

    const handleLanding = (value: 'today' | 'habits') => {
        if (value === (profile.default_landing ?? 'today')) return;
        updateProfile.mutate(
            { profileId: profile.id, data: { default_landing: value } },
            {
                onSuccess: () =>
                    toast.success(
                        `${profile.name} now lands on ${
                            LANDING_OPTIONS.find((o) => o.value === value)?.label ?? value
                        }`
                    )
            }
        );
    };

    const landingLabel =
        LANDING_OPTIONS.find((o) => o.value === (profile.default_landing ?? 'today'))?.label ??
        'Today';

    return (
        <SettingsCard
            label='Profile preferences'
            labelGapClass='mb-1.5'
            labelRight={
                <ProfileSelector
                    profiles={profiles}
                    selected={profile}
                    onSelect={onSelectProfile}
                />
            }
        >
            {TOGGLE_ROWS.map((row, index) => (
                <div
                    key={row.key}
                    className={`flex items-center justify-between gap-4 py-3.5 ${
                        index > 0 ? 'border-t' : ''
                    }`}
                    style={index > 0 ? { borderColor: 'rgba(255,255,255,.06)' } : undefined}
                >
                    <div>
                        <div className='text-[14.5px] font-medium' style={{ color: '#f0e7db' }}>
                            {row.title}
                        </div>
                        <div className='mt-0.5 text-[12px] text-text-muted'>{row.description}</div>
                    </div>
                    <EmberToggle
                        checked={profile[row.key] ?? row.defaultOn ?? false}
                        onChange={(value) => handleToggle(row, value)}
                        label={`${row.title} for ${profile.name}`}
                        disabled={updateProfile.isPending}
                    />
                </div>
            ))}

            <div
                className='flex items-center justify-between gap-4 border-t pb-1 pt-3.5'
                style={{ borderColor: 'rgba(255,255,255,.06)' }}
            >
                <div>
                    <div className='text-[14.5px] font-medium' style={{ color: '#f0e7db' }}>
                        Default landing
                    </div>
                    <div className='mt-0.5 text-[12px] text-text-muted'>
                        Where this profile opens
                    </div>
                </div>
                <Menu as='div' className='relative'>
                    <MenuButton
                        className='inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-[7px] text-[12.5px] text-text-secondary-soft outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-now-accent disabled:opacity-50'
                        style={{
                            backgroundColor: 'rgba(255,255,255,.04)',
                            borderColor: 'rgba(255,255,255,.1)'
                        }}
                        disabled={updateProfile.isPending}
                    >
                        {landingLabel}
                        <ChevronDown size={12} className='text-text-muted' />
                    </MenuButton>
                    <ThemedMenuItems anchor={{ to: 'bottom end', gap: 6 }} className='w-36'>
                        {LANDING_OPTIONS.map((option) => (
                            <MenuItem key={option.value}>
                                <button
                                    type='button'
                                    onClick={() => handleLanding(option.value)}
                                    className={menuItemClass}
                                >
                                    {option.label}
                                    {option.value === (profile.default_landing ?? 'today') && (
                                        <Check
                                            size={13}
                                            className='ml-auto shrink-0 text-now-accent'
                                            strokeWidth={3}
                                        />
                                    )}
                                </button>
                            </MenuItem>
                        ))}
                    </ThemedMenuItems>
                </Menu>
            </div>

            <PomodoroSettingsGroup profile={profile} />
        </SettingsCard>
    );
};
