import { IntegrationsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const deleteIntegrationConnection = async (connectionId: number): Promise<unknown> => {
    return await IntegrationsService.deleteIntegrationConnectionIntegrationsConnectionIdDelete(
        connectionId
    );
};

type UseDeleteIntegrationConnectionOptions = {
    mutationConfig?: MutationConfig<typeof deleteIntegrationConnection>;
};

export const useDeleteIntegrationConnection = ({
    mutationConfig
}: UseDeleteIntegrationConnectionOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: deleteIntegrationConnection,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
