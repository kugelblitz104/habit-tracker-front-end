import type { TrackerRead } from '@/api';
import { TrackersService } from '@/api';
import { pagedList } from '@/lib/paginate';
import type { QueryConfig } from '@/lib/react-query';
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

/**
 * Every habit entry across a profile over an inclusive span of local days.
 *
 * `dated` is a plain date, not an instant: a tracker is stamped with the day
 * the user says it happened on, so unlike tasks and time entries this needs no
 * UTC window.
 *
 * A span rather than a day because auto-skip is the reason this is read at
 * all: deciding whether a habit was even expected on a day means counting its
 * completions over the preceding range window.
 */
export const getDayTrackers = async (
    profileId: number,
    from: string,
    to: string
): Promise<TrackerRead[]> => {
    const { items } = await pagedList<TrackerRead>(
        async ({ offset, limit }) => {
            const page = await TrackersService.listTrackersTrackersGet(
                profileId,
                from,
                to,
                limit,
                offset
            );
            return { items: page.trackers ?? [], total: page.total };
        },
        { identify: (tracker) => tracker.id }
    );

    return items;
};

export const getDayTrackersQueryOptions = (
    profileId: number | null | undefined,
    from: string,
    to: string,
    enabled = true
) =>
    queryOptions({
        queryKey: ['trackers', { profileId, from, to }],
        queryFn: () => getDayTrackers(profileId!, from, to),
        enabled: !!profileId && enabled,
        placeholderData: keepPreviousData
    });

type UseDayTrackersOptions = {
    profileId: number | null | undefined;
    /** First local day of the span, `YYYY-MM-DD`. */
    from: string;
    /** Last local day of the span, inclusive. */
    to: string;
    /** False while the span is still being derived, so no wrong window is fetched. */
    enabled?: boolean;
    queryConfig?: QueryConfig<typeof getDayTrackersQueryOptions>;
};

export const useDayTrackers = ({
    profileId,
    from,
    to,
    enabled = true,
    queryConfig
}: UseDayTrackersOptions) =>
    useQuery({
        ...getDayTrackersQueryOptions(profileId, from, to, enabled),
        ...queryConfig
    });
