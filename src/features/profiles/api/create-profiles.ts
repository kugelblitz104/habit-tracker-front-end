import type { ProfileCreate, ProfileRead } from '@/api';
import { ProfilesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const createProfile = async (profile: ProfileCreate): Promise<ProfileRead> => {
    return await ProfilesService.createProfileProfilesPost(profile);
};

export const useCreateProfile = defineMutationHook(createProfile, (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
});
