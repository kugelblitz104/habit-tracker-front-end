import type { ProfileCreate, ProfileRead } from '@/api';
import { ProfilesService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const createProfile = async (profile: ProfileCreate): Promise<ProfileRead> => {
    return await ProfilesService.createProfileProfilesPost(profile);
};

type UseCreateProfileOptions = {
    mutationConfig?: MutationConfig<typeof createProfile>;
};

export const useCreateProfile = ({ mutationConfig }: UseCreateProfileOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: createProfile,
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
