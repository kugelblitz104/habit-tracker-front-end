import type { ProfileList, ProfileRead } from '@/api';
import { ProfilesService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getProfiles = async (): Promise<ProfileList> => {
    return await ProfilesService.listProfilesProfilesGet();
};

export const getProfile = async (profileId: number): Promise<ProfileRead> => {
    if (!profileId) throw new Error('profileId is required');
    return await ProfilesService.readProfileProfilesProfileIdGet(profileId);
};

export const getProfilesQueryOptions = () => {
    return queryOptions({
        queryKey: ['profiles'],
        queryFn: () => getProfiles()
    });
};

export const getProfileQueryOptions = (profileId: number | null | undefined) => {
    return queryOptions({
        queryKey: ['profile', { profileId }],
        queryFn: () => getProfile(profileId!),
        enabled: !!profileId
    });
};

type UseProfilesOptions = {
    queryConfig?: QueryConfig<typeof getProfilesQueryOptions>;
};

export const useProfiles = ({ queryConfig }: UseProfilesOptions = {}) => {
    return useQuery({
        ...getProfilesQueryOptions(),
        ...queryConfig
    });
};

type UseProfileOptions = {
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getProfileQueryOptions>;
};

export const useProfile = ({ profileId, queryConfig }: UseProfileOptions) => {
    return useQuery({
        ...getProfileQueryOptions(profileId),
        ...queryConfig
    });
};
