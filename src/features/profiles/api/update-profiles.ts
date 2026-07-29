import type { ProfileRead, ProfileUpdate } from '@/api';
import { ProfilesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export type UpdateProfileInput = {
    profileId: number;
    data: ProfileUpdate;
};

export const updateProfile = async ({
    profileId,
    data
}: UpdateProfileInput): Promise<ProfileRead> => {
    return await ProfilesService.patchProfileProfilesProfileIdPatch(profileId, data);
};

export const useUpdateProfile = defineMutationHook(updateProfile, (queryClient, data) => {
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    queryClient.invalidateQueries({
        queryKey: ['profile', { profileId: data.id }]
    });
});
