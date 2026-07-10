import type { CalendarEventList } from '@/api';
import { CalendarConnectionsService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const getCalendarEvents = async (
    profileId: number,
    targetDate?: string,
    days?: number,
    tz?: string
): Promise<CalendarEventList> => {
    return await CalendarConnectionsService.listCalendarEventsCalendarConnectionsEventsGet(
        profileId,
        targetDate,
        days ?? 1,
        tz
    );
};

export const getCalendarEventsQueryOptions = (
    profileId: number | null | undefined,
    targetDate?: string,
    days?: number,
    tz?: string
) => {
    return queryOptions({
        // targetDate, days and tz are part of the key so a new local day (or a
        // timezone/window change) is a distinct cache entry, never stale "yesterday".
        queryKey: ['calendar-events', { profileId, targetDate, days, tz }],
        queryFn: () => getCalendarEvents(profileId!, targetDate, days, tz),
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
    days?: number;
    tz?: string;
    queryConfig?: QueryConfig<typeof getCalendarEventsQueryOptions>;
};

export const useCalendarEvents = ({
    profileId,
    targetDate,
    days,
    tz,
    queryConfig
}: UseCalendarEventsOptions) => {
    return useQuery({
        ...getCalendarEventsQueryOptions(profileId, targetDate, days, tz),
        ...queryConfig
    });
};
