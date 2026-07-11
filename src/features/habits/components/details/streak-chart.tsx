import type { HabitStreak } from '@/api';
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { DetailPanel } from './detail-panel';

type StreakChartProps = {
    /** Streaks from the server, oldest-first (the ongoing streak, if any, is last). */
    streaks: HabitStreak[];
    /** How many of the most-recent streaks to display. */
    max?: number;
};

const startLabel = (dateString: string): string =>
    parseLocalDate(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const StreakChart = ({ streaks, max = 6 }: StreakChartProps) => {
    const todayStr = toLocalDateString(new Date());

    // Newest first, drop trivial one-day streaks, cap to `max` rows.
    const rows = [...streaks]
        .filter((s) => s.length > 1)
        .reverse()
        .slice(0, max);

    if (rows.length === 0) {
        return (
            <DetailPanel title='Recent streaks'>
                <div className='mt-3 font-mono text-[10.5px] text-[#5f7688]'>No streaks yet</div>
            </DetailPanel>
        );
    }

    const longest = Math.max(...rows.map((s) => s.length));

    return (
        <DetailPanel title='Recent streaks'>
            <div className='mt-[14px] flex flex-col gap-2'>
                {rows.map((streak, i) => {
                    const isNow = streak.end_date === todayStr;
                    const label = isNow ? 'now' : startLabel(streak.start_date);
                    const widthPct = Math.max((streak.length / longest) * 100, 8);
                    return (
                        <div key={i} className='flex items-center gap-[10px]'>
                            <span className='w-[52px] flex-none font-mono text-[10.5px] text-[#7f93a5]'>
                                {label}
                            </span>
                            <div className='h-[22px] flex-1 overflow-hidden rounded-[6px] bg-[rgba(255,255,255,0.04)]'>
                                <div
                                    className='flex h-full items-center justify-end rounded-[6px] px-2'
                                    style={{
                                        width: `${widthPct}%`,
                                        background: isNow
                                            ? 'var(--habit-detail-accent-bright, #8fc0e0)'
                                            : 'var(--habit-detail-accent, #6f9dc0)'
                                    }}
                                >
                                    <span className='font-mono text-[11px] font-semibold text-[#0f1418]'>
                                        {streak.length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </DetailPanel>
    );
};
