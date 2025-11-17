import type { HabitKPIs, Streak } from '@/api';

type KpiBoardProps = {
    habitKPIS?: HabitKPIs;
};

export const KpiBoard = ({ habitKPIS }: KpiBoardProps) => {
    return (
        <div>
            <h2 className='text-xl font-bold mb-4'>KPI Board</h2>
            <span>Current Streak: {habitKPIS?.current_streak}</span>
            <br />
            <span>Longest Streak: {habitKPIS?.longest_streak}</span>
            <br />
            <span>Total Completions: {habitKPIS?.total_completions}</span>
            <br />
            <span>
                30 Day Completion Rate: {habitKPIS?.thirty_day_completion_rate}%
            </span>
            <br />
            <span>
                Overall Completion Rate: {habitKPIS?.overall_completion_rate}%
            </span>
        </div>
    );
};
