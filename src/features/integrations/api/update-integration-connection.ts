import type { IntegrationConnectionRead, IntegrationConnectionUpdate } from '@/api';
import { IntegrationsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

type UpdateIntegrationConnectionInput = {
    connectionId: number;
    data: IntegrationConnectionUpdate;
};

export const updateIntegrationConnection = async ({
    connectionId,
    data
}: UpdateIntegrationConnectionInput): Promise<IntegrationConnectionRead> => {
    return await IntegrationsService.patchIntegrationConnectionIntegrationsConnectionIdPatch(
        connectionId,
        data
    );
};

export const useUpdateIntegrationConnection = defineMutationHook(
    updateIntegrationConnection,
    (queryClient) => {
        queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
    }
);
