import type { PublishResult } from '@/api';
import { IntegrationsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

type PublishTaskInput = {
    connectionId: number;
    taskId: number;
};

export const publishTask = async ({
    connectionId,
    taskId
}: PublishTaskInput): Promise<PublishResult> => {
    return await IntegrationsService.publishTaskIntegrationsConnectionIdPublishPost(connectionId, {
        task_id: taskId
    });
};

export const usePublishTask = defineMutationHook(publishTask, (queryClient) => {
    // The task now carries an external link — refresh so the chip shows.
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
});
