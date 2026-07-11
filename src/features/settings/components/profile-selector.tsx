import type { ProfileRead } from '@/api';
import { ThemedMenuItems } from '@/components/ui/menu';
import { ProfileAvatar } from '@/features/profiles/components/profile-avatar';
import { Menu, MenuButton, MenuItem } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

const itemClass =
    'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] text-text-secondary data-focus:bg-white/5';

type ProfileSelectorProps = {
    profiles: ProfileRead[];
    selected: ProfileRead;
    onSelect: (profileId: number) => void;
};

/**
 * "Editing {avatar} {name} ▾" pill — picks which profile the preferences card
 * (and the Calendars subgroup in Connections) is scoped to.
 */
export const ProfileSelector = ({ profiles, selected, onSelect }: ProfileSelectorProps) => (
    <Menu as='div' className='relative'>
        <MenuButton
            className='inline-flex items-center gap-[7px] rounded-chip border px-[11px] py-1 text-[12px] text-text-secondary-soft outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-now-accent'
            style={{
                backgroundColor: 'rgba(255,255,255,.04)',
                borderColor: 'rgba(255,255,255,.1)'
            }}
        >
            Editing
            <span className='inline-flex items-center gap-[5px] font-semibold'>
                <ProfileAvatar profile={selected} size={14} />
                {selected.name}
            </span>
            <ChevronDown size={12} className='text-text-muted' />
        </MenuButton>
        <ThemedMenuItems anchor={{ to: 'bottom end', gap: 6 }} className='w-52'>
            {profiles.map((profile) => (
                <MenuItem key={profile.id}>
                    <button
                        type='button'
                        onClick={() => onSelect(profile.id)}
                        className={itemClass}
                    >
                        <ProfileAvatar profile={profile} size={18} />
                        <span className='truncate'>{profile.name}</span>
                        {profile.id === selected.id && (
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
);
