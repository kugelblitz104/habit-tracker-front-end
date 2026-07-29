import type { IntegrationConnectionCreate, IntegrationConnectionRead } from '@/api';
import { IntegrationsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const createIntegrationConnection = async (
    connection: IntegrationConnectionCreate
): Promise<IntegrationConnectionRead> => {
    return await IntegrationsService.createIntegrationConnectionIntegrationsPost(connection);
};

export const useCreateIntegrationConnection = defineMutationHook(
    createIntegrationConnection,
    (queryClient) => {
        queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
    }
);
