import type { PublishResult } from '@/api';
import { IntegrationsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type PublishTaskInput = {
    connectionId: number;
    taskId: number;
};

export const publishTask = async ({
    connectionId,
    taskId
}: PublishTaskInput): Promise<PublishResult> => {
    return await IntegrationsService.publishTaskIntegrationsConnectionIdPublishPost(
        connectionId,
        { task_id: taskId }
    );
};

type UsePublishTaskOptions = {
    mutationConfig?: MutationConfig<typeof publishTask>;
};

export const usePublishTask = ({ mutationConfig }: UsePublishTaskOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: publishTask,
        onSuccess: (data, ...args) => {
            // The task now carries an external link — refresh so the chip shows.
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
