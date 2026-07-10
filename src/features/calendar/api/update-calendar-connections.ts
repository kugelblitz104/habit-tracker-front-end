import type { CalendarConnectionRead, CalendarConnectionUpdate } from '@/api';
import { CalendarConnectionsService } from '@/api';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type UpdateCalendarConnectionInput = {
    connectionId: number;
    data: CalendarConnectionUpdate;
};

export const updateCalendarConnection = async ({
    connectionId,
    data
}: UpdateCalendarConnectionInput): Promise<CalendarConnectionRead> => {
    return await CalendarConnectionsService.patchCalendarConnectionCalendarConnectionsConnectionIdPatch(
        connectionId,
        data
    );
};

type UseUpdateCalendarConnectionOptions = {
    mutationConfig?: MutationConfig<typeof updateCalendarConnection>;
};

export const useUpdateCalendarConnection = ({
    mutationConfig
}: UseUpdateCalendarConnectionOptions = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...restConfig } = mutationConfig ?? {};
    return useMutation({
        mutationFn: updateCalendarConnection,
        onSuccess: (data, ...args) => {
            queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            onSuccess?.(data, ...args);
        },
        ...restConfig
    });
};
