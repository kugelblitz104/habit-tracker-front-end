import type { CalendarConnectionList } from '@/api';
import { CalendarConnectionsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getCalendarConnections = async (
    profileId: number
): Promise<CalendarConnectionList> => {
    return await CalendarConnectionsService.listCalendarConnectionsCalendarConnectionsGet(
        profileId
    );
};

export const getCalendarConnectionsQueryOptions = (profileId: number | null | undefined) => {
    return queryOptions({
        queryKey: ['calendar-connections', { profileId }],
        queryFn: () => getCalendarConnections(profileId!),
        enabled: !!profileId
    });
};

type UseCalendarConnectionsOptions = {
    profileId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getCalendarConnectionsQueryOptions>;
};

export const useCalendarConnections = ({
    profileId,
    queryConfig
}: UseCalendarConnectionsOptions) => {
    return useQuery({
        ...getCalendarConnectionsQueryOptions(profileId),
        ...queryConfig
    });
};
