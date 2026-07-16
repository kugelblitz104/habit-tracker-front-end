import type { IntegrationConnectionCreate, IntegrationConnectionRead } from '@/api';
import { IntegrationsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const createIntegrationConnection = async (
    connection: IntegrationConnectionCreate
): Promise<IntegrationConnectionRead> => {
    return await IntegrationsService.createIntegrationConnectionIntegrationsPost(connection);
};

type UseCreateIntegrationConnectionOptions = {
    mutationConfig?: MutationConfig<typeof createIntegrationConnection>;
};

export const useCreateIntegrationConnection = ({
    mutationConfig
}: UseCreateIntegrationConnectionOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: createIntegrationConnection,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
