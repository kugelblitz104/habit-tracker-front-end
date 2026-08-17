import type { CalendarConnectionList, CalendarConnectionRead } from '@/api';
import { CalendarConnectionsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { pagedList } from '@/lib/paginate';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getCalendarConnections = async (
    profileId: number
): Promise<CalendarConnectionList> => {
    const { items, ...envelope } = await pagedList<CalendarConnectionRead>(({ offset, limit }) =>
        CalendarConnectionsService.listCalendarConnectionsCalendarConnectionsGet(
            profileId,
            limit,
            offset
        ).then((page) => ({ items: page.calendar_connections ?? [], total: page.total }))
    );

    return { calendar_connections: items, ...envelope };
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
