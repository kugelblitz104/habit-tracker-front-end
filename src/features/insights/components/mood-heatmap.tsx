import { useJournalEntries } from '@/features/journal/api/get-journal-entries';
import { DAY_QUALITY_GROUPS, dayQualityColor } from '@/features/journal/utils/day-quality';
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { buildMoodWeeks } from '../utils/mood-grid';
import { ChartCard } from './chart-card';

const WEEKS = 53;
const EMPTY_CELL = 'var(--surface-input-border)';

const dayLabel = (day: string) =>
    parseLocalDate(day).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

const monthLabel = (day: string) =>
    parseLocalDate(day).toLocaleDateString(undefined, { month: 'short' });

type MoodHeatmapProps = {
    profileId: number | null | undefined;
    weekStartMonday: boolean;
};

/**
 * A year of journal day-quality words as a calendar grid, one cell per day,
 * coloured by tonal group. Each logged day links to its journal entry.
 */
export const MoodHeatmap = ({ profileId, weekStartMonday }: MoodHeatmapProps) => {
    const today = toLocalDateString(new Date());
    const weeks = useMemo(
        () => buildMoodWeeks(today, WEEKS, weekStartMonday),
        [today, weekStartMonday]
    );
    const fromDate = weeks[0]![0]!;

    const { data } = useJournalEntries({ profileId, fromDate, toDate: today });
    const qualityByDay = useMemo(
        () =>
            new Map(
                (data?.entries ?? [])
                    .filter((e) => e.day_quality)
                    .map((e) => [e.entry_date, e.day_quality!])
            ),
        [data]
    );

    return (
        <ChartCard
            title='Mood'
            meta={`${qualityByDay.size} days logged`}
            isEmpty={false}
            emptyMessage=''
        >
            {/* row-reverse with newest-first columns keeps today in view when the grid scrolls. */}
            <div className='flex flex-row-reverse gap-[3px] overflow-x-auto pb-1'>
                {[...weeks].reverse().map((week, i, reversed) => {
                    const first = week[0]!;
                    const previous = reversed[i + 1]?.[0];
                    // The oldest column is usually partial, so it goes unlabelled.
                    const showMonth =
                        !!previous &&
                        parseLocalDate(previous).getMonth() !== parseLocalDate(first).getMonth();
                    return (
                        <div key={first} className='flex min-w-3 flex-1 flex-col gap-[3px]'>
                            <span className='h-3 whitespace-nowrap font-mono text-[9px] leading-3 text-text-faint'>
                                {showMonth ? monthLabel(first) : ''}
                            </span>
                            {week.map((day, d) => {
                                if (!day) return <span key={d} className='aspect-square w-full' />;
                                const quality = qualityByDay.get(day);
                                const label = `${dayLabel(day)}: ${quality ?? 'no entry'}`;
                                return (
                                    <Link
                                        key={day}
                                        to={`/journal?date=${day}`}
                                        title={label}
                                        aria-label={label}
                                        className='aspect-square w-full rounded-[2px] transition-opacity hover:opacity-70 focus-visible:outline-1 focus-visible:outline-now-accent'
                                        style={{
                                            backgroundColor: dayQualityColor(quality) ?? EMPTY_CELL
                                        }}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            <div className='mt-2 flex flex-wrap gap-4'>
                {DAY_QUALITY_GROUPS.map((group) => (
                    <span
                        key={group.key}
                        className='flex items-center gap-1.5 font-mono text-label text-text-muted'
                    >
                        <span
                            className='size-2.5 rounded-[2px]'
                            style={{ backgroundColor: group.color }}
                        />
                        {group.label}
                    </span>
                ))}
            </div>
        </ChartCard>
    );
};
