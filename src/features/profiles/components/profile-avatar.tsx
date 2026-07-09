import type { ProfileRead } from '@/api';

type ProfileAvatarProps = {
    profile: ProfileRead | null | undefined;
    size?: number;
};

/**
 * Round avatar filled with the profile's gradient (color_start → color_end from
 * the DB), falling back to a neutral gray gradient when a profile isn't resolved
 * yet or lacks color fields.
 */
export const ProfileAvatar = ({ profile, size = 24 }: ProfileAvatarProps) => {
    const background =
        profile?.color_start && profile?.color_end
            ? `linear-gradient(135deg, ${profile.color_start}, ${profile.color_end})`
            : 'linear-gradient(135deg, #6f685e, #57524a)';

    return (
        <span
            className='inline-block shrink-0 rounded-full'
            style={{ width: size, height: size, background }}
            aria-hidden='true'
        />
    );
};
