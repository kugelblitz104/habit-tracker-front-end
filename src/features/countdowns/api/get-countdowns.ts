import type { CountdownList } from '@/api';
import { CountdownsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { countdownKeys } from './query-keys';

export const getCountdowns = async (profileId: number): Promise<CountdownList> =>
    CountdownsService.listCountdownsCountdownsGet(profileId);

export const getCountdownsQueryOptions = (profileId: number | null | undefined) =>
    queryOptions({
        queryKey: countdownKeys.list(profileId),
        queryFn: () => getCountdowns(profileId!),
        enabled: !!profileId
    });

type UseCountdownsOptions = {
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getCountdownsQueryOptions>;
};

export const useCountdowns = ({ profileId, queryConfig }: UseCountdownsOptions) =>
    useQuery({
        ...getCountdownsQueryOptions(profileId),
        ...queryConfig
    });
