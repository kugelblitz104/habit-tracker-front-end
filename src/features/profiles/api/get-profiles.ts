import type { ProfileList, ProfileRead } from '@/api';
import { ProfilesService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { pagedList } from '@/lib/paginate';
import { queryOptions, useQuery } from '@tanstack/react-query';

/** Fetch every profile the caller can see. The profile switcher and
 *  `auth-context` both treat this list as complete. */
export const getProfiles = async (): Promise<ProfileList> => {
    const { items, ...envelope } = await pagedList<ProfileRead>(({ offset, limit }) =>
        ProfilesService.listProfilesProfilesGet(undefined, limit, offset).then((page) => ({
            items: page.profiles ?? [],
            total: page.total
        }))
    );

    return { profiles: items, ...envelope };
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
