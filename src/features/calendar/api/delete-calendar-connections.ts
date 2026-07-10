import { CalendarConnectionsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const deleteCalendarConnection = async (connectionId: number): Promise<unknown> => {
    return await CalendarConnectionsService.deleteCalendarConnectionCalendarConnectionsConnectionIdDelete(
        connectionId
    );
};

type UseDeleteCalendarConnectionOptions = {
    mutationConfig?: MutationConfig<typeof deleteCalendarConnection>;
};

export const useDeleteCalendarConnection = ({
    mutationConfig
}: UseDeleteCalendarConnectionOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: deleteCalendarConnection,
        onSuccess: (...args) => {
            // Connection scope is unknown from the id alone; refresh everything.
            queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            onSuccess?.(...args);
        },
        ...restConfig
    });
};
