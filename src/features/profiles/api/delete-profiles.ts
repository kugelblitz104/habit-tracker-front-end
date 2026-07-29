import { ProfilesService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const deleteProfile = async (profileId: number): Promise<unknown> => {
    return await ProfilesService.deleteProfileProfilesProfileIdDelete(profileId);
};

export const useDeleteProfile = defineMutationHook(deleteProfile, (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
});
