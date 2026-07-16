import type { IntegrationConnectionRead, IntegrationConnectionUpdate } from '@/api';
import { IntegrationsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

type UseUpdateIntegrationConnectionOptions = {
    mutationConfig?: MutationConfig<typeof updateIntegrationConnection>;
};

export const useUpdateIntegrationConnection = ({
    mutationConfig
}: UseUpdateIntegrationConnectionOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: updateIntegrationConnection,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
