import type { TrackerLite, TrackerLiteList, TrackerRead } from '@/api';
import { HabitsService, TrackersService } from '@/api';
import { getBrowserTimeZone } from '@/lib/date-utils';
import { pagedList } from '@/lib/paginate';

export const getTracker = async (trackerId: number): Promise<TrackerRead> => {
    return await TrackersService.readTrackerTrackersTrackerIdGet(trackerId);
};

/** The `limit` the lite endpoint caps requests at. It recomputes
 *  `auto_skipped_dates` over the whole range on every request. */
const TRACKER_PAGE_SIZE = 1000;

/**
 * Fetch trackers in a lightweight format for a date window, all of them.
 *
 * `end_date`, `days`, `has_previous` and `auto_skipped_dates` describe the
 * window rather than the page, so they are taken from the first response and
 * only `trackers` accumulates. Streak and KPI maths read `auto_skipped_dates`.
 *
 * @param habitId - The habit ID to fetch trackers for
 * @param endDate - End date for the range (defaults to today if undefined)
 * @param days - Number of days to fetch (default: 42 = 6 weeks)
 */
export const getTrackersLite = async (
    habitId: number,
    endDate?: string,
    days: number = 42
): Promise<TrackerLiteList> => {
    // tz sets the DEFAULT end_date to today in the user's zone when endDate is
    // omitted (no-op when endDate is sent). Not part of any query key.
    const tz = getBrowserTimeZone();
    let range: Omit<TrackerLiteList, 'trackers' | 'total' | 'limit' | 'offset'> | undefined;

    const { items, ...envelope } = await pagedList<TrackerLite>(
        ({ offset, limit }) =>
            HabitsService.listHabitTrackersLiteHabitsHabitIdTrackersLiteGet(
                habitId,
                endDate,
                days,
                tz,
                limit,
                offset
            ).then((page) => {
                range ??= {
                    end_date: page.end_date,
                    days: page.days,
                    has_previous: page.has_previous,
                    auto_skipped_dates: page.auto_skipped_dates
                };
                return { items: page.trackers ?? [], total: page.total };
            }),
        { pageSize: TRACKER_PAGE_SIZE, identify: (item) => item.id }
    );

    return {
        trackers: items,
        ...envelope,
        end_date: range?.end_date ?? '',
        days: range?.days ?? days,
        has_previous: range?.has_previous ?? false,
        auto_skipped_dates: range?.auto_skipped_dates ?? []
    };
};
