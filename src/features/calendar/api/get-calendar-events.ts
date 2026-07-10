import type { CalendarEventList } from '@/api';
import { CalendarConnectionsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getCalendarEvents = async (
    profileId: number,
    targetDate?: string,
    tz?: string
): Promise<CalendarEventList> => {
    return await CalendarConnectionsService.listCalendarEventsCalendarConnectionsEventsGet(
        profileId,
        targetDate,
        tz
    );
};

export const getCalendarEventsQueryOptions = (
    profileId: number | null | undefined,
    targetDate?: string,
    tz?: string
) => {
    return queryOptions({
        // targetDate and tz are part of the key so a new local day (or a
        // timezone change) is a distinct cache entry, never stale "yesterday".
        queryKey: ['calendar-events', { profileId, targetDate, tz }],
        queryFn: () => getCalendarEvents(profileId!, targetDate, tz),
        enabled: !!profileId,
        // The server caches ICS feeds for ~15 min; keep Today fresh without
        // hammering the feeds on every focus/mount.
        staleTime: 1000 * 60 * 5,
        refetchInterval: 1000 * 60 * 15
    });
};

type UseCalendarEventsOptions = {
    profileId: number | null | undefined;
    targetDate?: string;
    tz?: string;
    queryConfig?: QueryConfig<typeof getCalendarEventsQueryOptions>;
};

export const useCalendarEvents = ({
    profileId,
    targetDate,
    tz,
    queryConfig
}: UseCalendarEventsOptions) => {
    return useQuery({
        ...getCalendarEventsQueryOptions(profileId, targetDate, tz),
        ...queryConfig
    });
};
