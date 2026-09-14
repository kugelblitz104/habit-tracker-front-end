import { useHabits } from '@/features/habits/api/get-habits';
import { shiftDay } from '@/lib/date-utils';
import { TrackerStatus } from '@/types/types';
import { Check, Minus, SkipForward } from 'lucide-react';
import { useDayTrackers } from '../api/get-day-trackers';
import { habitsExpectedOn } from '../utils/day-summary';
import { DayRow, DaySection } from './day-section';

type DayHabitsProps = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
};

const MARK = {
    [TrackerStatus.COMPLETED]: { Icon: Check, label: 'Completed' },
    [TrackerStatus.SKIPPED]: { Icon: SkipForward, label: 'Skipped' },
    [TrackerStatus.NOT_COMPLETED]: { Icon: Minus, label: 'Not completed' }
} as const;

/**
 * The habit entries recorded on this day, one row per habit that was marked.
 *
 * The figure counts completions against the habits the day actually asked
 * for, not against every habit in the profile: a monthly habit kept last week
 * is auto-skipped today and drops out of the denominator, so four habits with
 * one of them already satisfied read as 1/3.
 *
 * Archived habits are out of the denominator but their entries still appear,
 * because retiring a habit does not unmake the days it was kept.
 */
export const DayHabits = ({ profileId, date }: DayHabitsProps) => {
    const habitsQuery = useHabits({ profileId });
    const habits = habitsQuery.data?.habits ?? [];

    // Auto-skip looks back `range - 1` days, so one window cut to the widest
    // habit answers the question for all of them in a single read.
    const lookback = Math.max(0, ...habits.filter((h) => !h.archived).map((h) => h.range - 1));
    const trackersQuery = useDayTrackers({
        profileId,
        from: shiftDay(date, -lookback),
        to: date,
        // The window is derived from the habits, so asking before they land
        // would fetch the wrong span and then refetch.
        enabled: habitsQuery.isSuccess
    });

    const window = trackersQuery.data ?? [];
    const rows = window.filter((tracker) => tracker.dated === date);
    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const expected = habitsExpectedOn(habits, window, date);
    const completed = rows.filter((row) => row.status === TrackerStatus.COMPLETED).length;

    return (
        <DaySection
            title='Habits'
            meta={expected > 0 ? `${completed}/${expected}` : null}
            isLoading={habitsQuery.isLoading || trackersQuery.isLoading}
            isError={habitsQuery.isError || trackersQuery.isError}
            isBusy={trackersQuery.isPlaceholderData}
            errorMessage='Failed to load the habit entries for this day.'
            emptyMessage='No habits were marked on this day.'
            isEmpty={rows.length === 0}
        >
            {rows.map((row) => {
                const habit = byId.get(row.habit_id);
                const { Icon, label } = MARK[row.status as keyof typeof MARK] ?? MARK[0];
                return (
                    <DayRow
                        key={row.id}
                        dotColor={habit?.color}
                        // A tracker whose habit is missing from the list is
                        // still a real entry, so it says so rather than
                        // vanishing.
                        title={habit?.name ?? 'Deleted habit'}
                        struck={row.status === TrackerStatus.NOT_COMPLETED}
                        trailing={<Icon size={12} aria-label={label} />}
                    />
                );
            })}
        </DaySection>
    );
};
