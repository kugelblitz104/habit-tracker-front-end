import { ProfilesService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const deleteProfile = async (profileId: number): Promise<unknown> => {
    return await ProfilesService.deleteProfileProfilesProfileIdDelete(profileId);
};

type UseDeleteProfileOptions = {
    mutationConfig?: MutationConfig<typeof deleteProfile>;
};

export const useDeleteProfile = ({ mutationConfig }: UseDeleteProfileOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: deleteProfile,
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
