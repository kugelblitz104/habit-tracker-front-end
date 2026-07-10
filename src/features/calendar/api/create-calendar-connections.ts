import type { CalendarConnectionCreate, CalendarConnectionRead } from '@/api';
import { CalendarConnectionsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const createCalendarConnection = async (
    connection: CalendarConnectionCreate
): Promise<CalendarConnectionRead> => {
    return await CalendarConnectionsService.createCalendarConnectionCalendarConnectionsPost(
        connection
    );
};

type UseCreateCalendarConnectionOptions = {
    mutationConfig?: MutationConfig<typeof createCalendarConnection>;
};

export const useCreateCalendarConnection = ({
    mutationConfig
}: UseCreateCalendarConnectionOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: createCalendarConnection,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
