import { LogoutModal } from '@/features/auth/components/modals/logout-modal';
import { useAuth } from '@/lib/auth-context';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Check, ChevronDown, ListChecks, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ProfileAvatar } from './profile-avatar';

/**
 * Header profile pill: gradient avatar + name + ▾. Opens a Headless UI menu
 * listing every profile (switching sets the active profile), plus reachable
 * navigation (Habits, Settings) and Logout — the themed Today surface replaces
 * the old slate TitleBar, so those affordances live here.
 */
export const ProfileSwitcher = () => {
    const { activeProfile, profiles, setActiveProfileId, logout } = useAuth();
    const navigate = useNavigate();
    const [logoutOpen, setLogoutOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <>
            <Menu as='div' className='relative'>
                <MenuButton className='flex items-center gap-2 rounded-chip border py-1 pl-1 pr-2.5 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-now-accent'
                    style={{ borderColor: 'var(--surface-card-border)' }}
                >
                    <ProfileAvatar profile={activeProfile} size={24} />
                    <span className='font-display text-[13px] text-text-secondary'>
                        {activeProfile?.name ?? 'Profile'}
                    </span>
                    <ChevronDown size={14} className='text-text-muted' />
                </MenuButton>
                <MenuItems
                    anchor={{ to: 'bottom end', gap: 8 }}
                    className='z-50 w-56 rounded-button border p-1 shadow-popover outline-none'
                    style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    <p className='px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint'>
                        Profiles
                    </p>
                    {profiles.map((profile) => {
                        const isActive = profile.id === activeProfile?.id;
                        return (
                            <MenuItem key={profile.id}>
                                <button
                                    type='button'
                                    onClick={() => setActiveProfileId(profile.id)}
                                    className='flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left data-focus:bg-white/5'
                                >
                                    <ProfileAvatar profile={profile} size={20} />
                                    <span className='font-display text-[13px] text-text-secondary'>
                                        {profile.name}
                                    </span>
                                    {isActive && (
                                        <Check
                                            size={14}
                                            className='ml-auto text-now-accent'
                                            strokeWidth={3}
                                        />
                                    )}
                                </button>
                            </MenuItem>
                        );
                    })}

                    <div
                        className='my-1 border-t'
                        style={{ borderColor: 'var(--surface-card-border)' }}
                    />

                    <MenuItem>
                        <button
                            type='button'
                            onClick={() => navigate('/habits')}
                            className='flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] text-text-secondary data-focus:bg-white/5'
                        >
                            <ListChecks size={16} className='text-text-muted' />
                            Habits
                        </button>
                    </MenuItem>
                    <MenuItem>
                        <button
                            type='button'
                            onClick={() => navigate('/settings')}
                            className='flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] text-text-secondary data-focus:bg-white/5'
                        >
                            <Settings size={16} className='text-text-muted' />
                            Settings
                        </button>
                    </MenuItem>
                    <MenuItem>
                        <button
                            type='button'
                            onClick={() => setLogoutOpen(true)}
                            className='flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] data-focus:bg-white/5'
                            style={{ color: 'var(--color-danger)' }}
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </MenuItem>
                </MenuItems>
            </Menu>

            <LogoutModal
                isOpen={logoutOpen}
                onClose={() => setLogoutOpen(false)}
                handleLogout={handleLogout}
            />
        </>
    );
};
