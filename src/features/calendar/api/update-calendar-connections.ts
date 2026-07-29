import type { CalendarConnectionRead, CalendarConnectionUpdate } from '@/api';
import { CalendarConnectionsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

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

export const useUpdateCalendarConnection = defineMutationHook(updateCalendarConnection, (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
});
