import type { ProfileRead, ProfileUpdate } from '@/api';
import { ProfilesService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

type UseUpdateProfileOptions = {
    mutationConfig?: MutationConfig<typeof updateProfile>;
};

export const useUpdateProfile = ({ mutationConfig }: UseUpdateProfileOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: updateProfile,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({
                queryKey: ['profile', { profileId: data.id }]
            });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
