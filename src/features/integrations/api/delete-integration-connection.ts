import { IntegrationsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const deleteIntegrationConnection = async (connectionId: number): Promise<unknown> => {
    return await IntegrationsService.deleteIntegrationConnectionIntegrationsConnectionIdDelete(
        connectionId
    );
};

export const useDeleteIntegrationConnection = defineMutationHook(
    deleteIntegrationConnection,
    (queryClient) => {
        queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
    }
);
