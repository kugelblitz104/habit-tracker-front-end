import type { HabitKPIs } from '@/api';
import {
    Flame,
    Trophy,
    CheckCircle2,
    TrendingUp,
    ChartPie,
    CalendarCheck2
} from 'lucide-react';

type KpiBoardProps = {
    habitKPIS?: HabitKPIs;
};

type KPICardProps = {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: string;
};

const KPICard = ({
    icon,
    label,
    value,
    subtitle,
    color = 'text-blue-400'
}: KPICardProps) => {
    return (
        <div className='bg-slate-800 rounded-lg p-6 flex flex-col items-center justify-center text-center'>
            <div className={`mb-3 ${color}`}>{icon}</div>
            <div className='text-gray-400 text-sm mb-2 uppercase tracking-wide font-semibold'>
                {label}
            </div>
            <div className='text-3xl font-bold text-white mb-1'>{value}</div>
            <div className='text-sm text-gray-500 h-5'>{subtitle}</div>
        </div>
    );
};

export const KpiBoard = ({ habitKPIS }: KpiBoardProps) => {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    if (!habitKPIS) {
        return (
            <div className='text-gray-400 text-center py-8'>
                No KPI data available
            </div>
        );
    }

    return (
        <div className='w-full'>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 m-4'>
                <KPICard
                    icon={<Flame size={32} />}
                    label='Current Streak'
                    value={habitKPIS.current_streak ?? 0}
                    subtitle={habitKPIS.current_streak === 1 ? 'day' : 'days'}
                    color='text-orange-400'
                />

                <KPICard
                    icon={<Trophy size={32} />}
                    label='Longest Streak'
                    value={habitKPIS.longest_streak ?? 0}
                    subtitle={habitKPIS.longest_streak === 1 ? 'day' : 'days'}
                    color='text-yellow-400'
                />

                <KPICard
                    icon={<CheckCircle2 size={32} />}
                    label='Total Completions'
                    value={habitKPIS.total_completions}
                    subtitle='all time'
                    color='text-green-400'
                />

                <KPICard
                    icon={<CalendarCheck2 size={32} />}
                    label='Last Completed'
                    value={formatDate(habitKPIS.last_completed_date)}
                    subtitle={
                        habitKPIS.last_completed_date
                            ? new Date(habitKPIS.last_completed_date)
                                  .getFullYear()
                                  .toString()
                            : 'Never'
                    }
                    color='text-indigo-400'
                />

                <KPICard
                    icon={<TrendingUp size={32} />}
                    label='30-Day Rate'
                    value={formatPercentage(
                        habitKPIS.thirty_day_completion_rate
                    )}
                    subtitle='completion rate'
                    color='text-purple-400'
                />

                <KPICard
                    icon={<ChartPie size={32} />}
                    label='Overall Rate'
                    value={formatPercentage(habitKPIS.overall_completion_rate)}
                    subtitle='completion rate'
                    color='text-cyan-400'
                />
            </div>
        </div>
    );
};
