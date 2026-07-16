import type { IntegrationConnectionList } from '@/api';
import { IntegrationsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getIntegrationConnections = async (
    profileId: number
): Promise<IntegrationConnectionList> => {
    return await IntegrationsService.listIntegrationConnectionsIntegrationsGet(profileId);
};

export const getIntegrationConnectionsQueryOptions = (
    profileId: number | null | undefined
) => {
    return queryOptions({
        queryKey: ['integration-connections', { profileId }],
        queryFn: () => getIntegrationConnections(profileId!),
        enabled: !!profileId
    });
};

type UseIntegrationConnectionsOptions = {
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getIntegrationConnectionsQueryOptions>;
};

export const useIntegrationConnections = ({
    profileId,
    queryConfig
}: UseIntegrationConnectionsOptions) => {
    return useQuery({
        ...getIntegrationConnectionsQueryOptions(profileId),
        ...queryConfig
    });
};
