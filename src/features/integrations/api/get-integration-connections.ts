import type { IntegrationConnectionList, IntegrationConnectionRead } from '@/api';
import { IntegrationsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { pagedList } from '@/lib/paginate';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getIntegrationConnections = async (
    profileId: number
): Promise<IntegrationConnectionList> => {
    const { items, ...envelope } = await pagedList<IntegrationConnectionRead>(({ offset, limit }) =>
        IntegrationsService.listIntegrationConnectionsIntegrationsGet(
            profileId,
            limit,
            offset
        ).then((page) => ({
            items: page.integration_connections ?? [],
            total: page.total
        }))
    );

    return { integration_connections: items, ...envelope };
};

export const getIntegrationConnectionsQueryOptions = (profileId: number | null | undefined) => {
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
