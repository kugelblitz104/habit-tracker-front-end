import { formatHumanDuration } from '@/features/time-entries/utils/format-duration';
import type { InsightsData } from '../hooks/use-insights-data';

const cardLabelClass =
    'font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';
const cardValueClass = 'font-display text-[26px] font-semibold leading-none text-text-primary';
const cardSubClass = 'font-mono text-[11px] text-text-muted';

const Card = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div
        className='rounded-card border p-4'
        style={{
            backgroundColor: 'var(--surface-card-bg)',
            borderColor: 'var(--surface-card-border)'
        }}
    >
        <h3 className={cardLabelClass}>{label}</h3>
        <div className='mt-2 flex items-baseline gap-2'>
            <span className={cardValueClass}>{value}</span>
        </div>
        {sub && <p className={`mt-1 ${cardSubClass}`}>{sub}</p>}
    </div>
);

/**
 * The review header: five at-a-glance stat cards for the selected window.
 * `Habit completion` / `Habits on streak` are omitted when the profile has no
 * habits, so the row doesn't show hollow zeros.
 */
export const InsightsSummaryCards = ({ data }: { data: InsightsData }) => {
    const hasHabits = data.habitPerf.length > 0;
    return (
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
            <Card
                label='Tasks completed'
                value={String(data.tasksCompleted)}
                sub={data.tasksTruncated ? 'most recent 500' : undefined}
            />
            <Card
                label='Time tracked'
                value={
                    data.timeTrackedSeconds > 0 ? formatHumanDuration(data.timeTrackedSeconds) : '0m'
                }
                sub={data.timeTruncated ? 'most recent 500' : undefined}
            />
            {hasHabits && (
                <Card label='Habit completion' value={`${data.habitCompletionRate}%`} sub='avg rate' />
            )}
            {hasHabits && (
                <Card
                    label='Habits on streak'
                    value={String(data.habitsOnStreak)}
                    sub={`of ${data.habitPerf.length}`}
                />
            )}
            <Card
                label='Open now'
                value={String(data.openCount)}
                sub={data.overdueCount > 0 ? `${data.overdueCount} overdue` : 'none overdue'}
            />
        </div>
    );
};
