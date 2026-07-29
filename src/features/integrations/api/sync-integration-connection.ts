import type { IntegrationSyncResult } from '@/api';
import { IntegrationsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const syncIntegrationConnection = async (
    connectionId: number
): Promise<IntegrationSyncResult> => {
    return await IntegrationsService.syncIntegrationConnectionIntegrationsConnectionIdSyncPost(
        connectionId
    );
};

export const useSyncIntegrationConnection = defineMutationHook(
    syncIntegrationConnection,
    (queryClient) => {
        // Newly-imported items become tasks — refresh the task lists.
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
    }
);
