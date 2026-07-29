import { Flame } from 'lucide-react';
import type { HabitPerf } from '../hooks/use-insights-data';
import { ChartCard } from './chart-card';

/**
 * Per-habit completion rate over the window as horizontal bars (each in the
 * habit's own color), with the current streak flagged alongside. Div bars keep
 * this light — no chart lib needed for a simple ranked list.
 */
export const HabitPerformanceChart = ({ habits }: { habits: HabitPerf[] }) => {
    return (
        <ChartCard
            title='Habit completion'
            meta={`${habits.length} ${habits.length === 1 ? 'habit' : 'habits'}`}
            isEmpty={habits.length === 0}
            emptyMessage='No active habits.'
        >
            <ul className='flex flex-col gap-3'>
                {habits.map((h) => (
                    <li key={h.id}>
                        <div className='mb-1 flex items-baseline justify-between gap-2'>
                            <span className='truncate font-display text-[13px] text-text-secondary'>
                                {h.name}
                            </span>
                            <span className='flex shrink-0 items-center gap-2 font-mono text-[11px] text-text-muted tabular-nums'>
                                {h.currentStreak > 0 && (
                                    <span
                                        className='flex items-center gap-0.5'
                                        style={{ color: 'var(--color-now-accent)' }}
                                        title={`${h.currentStreak}-day streak`}
                                    >
                                        <Flame size={11} />
                                        {h.currentStreak}
                                    </span>
                                )}
                                {h.completionRate}%
                            </span>
                        </div>
                        <div
                            className='h-2 w-full overflow-hidden rounded-full'
                            style={{ backgroundColor: 'var(--surface-input-bg)' }}
                        >
                            <div
                                className='h-full rounded-full'
                                style={{
                                    width: `${Math.min(100, h.completionRate)}%`,
                                    backgroundColor: h.color
                                }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        </ChartCard>
    );
};
