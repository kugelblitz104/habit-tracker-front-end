import type { IntegrationSyncResult } from '@/api';
import { IntegrationsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const syncIntegrationConnection = async (
    connectionId: number
): Promise<IntegrationSyncResult> => {
    return await IntegrationsService.syncIntegrationConnectionIntegrationsConnectionIdSyncPost(
        connectionId
    );
};

type UseSyncIntegrationConnectionOptions = {
    mutationConfig?: MutationConfig<typeof syncIntegrationConnection>;
};

export const useSyncIntegrationConnection = ({
    mutationConfig
}: UseSyncIntegrationConnectionOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: syncIntegrationConnection,
        onSuccess: (data, ...args) => {
            // Newly-imported items become tasks — refresh the task lists.
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
