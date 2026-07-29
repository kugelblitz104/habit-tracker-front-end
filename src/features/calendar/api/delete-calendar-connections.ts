import { CalendarConnectionsService } from '@/api';
import { defineMutationHook } from '@/lib/react-query';

export const deleteCalendarConnection = async (connectionId: number): Promise<unknown> => {
    return await CalendarConnectionsService.deleteCalendarConnectionCalendarConnectionsConnectionIdDelete(
        connectionId
    );
};

export const useDeleteCalendarConnection = defineMutationHook(deleteCalendarConnection, (queryClient) => {
    // Connection scope is unknown from the id alone; refresh everything.
    queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
});
