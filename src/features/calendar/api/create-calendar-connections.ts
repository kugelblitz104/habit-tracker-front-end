import type { CalendarConnectionCreate, CalendarConnectionRead } from '@/api';
import { CalendarConnectionsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const createCalendarConnection = async (
    connection: CalendarConnectionCreate
): Promise<CalendarConnectionRead> => {
    return await CalendarConnectionsService.createCalendarConnectionCalendarConnectionsPost(
        connection
    );
};

export const useCreateCalendarConnection = defineMutationHook(
    createCalendarConnection,
    (queryClient) => {
        queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    }
);
