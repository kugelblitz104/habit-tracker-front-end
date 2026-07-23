import { AppHeader } from '@/components/layouts/app-header';
import { HabitPerformanceChart } from '@/features/insights/components/habit-performance-chart';
import { InsightsSummaryCards } from '@/features/insights/components/insights-summary-cards';
import { RangeToggle } from '@/features/insights/components/range-toggle';
import { TaskThroughputChart } from '@/features/insights/components/task-throughput-chart';
import { TimeByProjectChart } from '@/features/insights/components/time-by-project-chart';
import { TimeTrackedChart } from '@/features/insights/components/time-tracked-chart';
import { useInsightsData } from '@/features/insights/hooks/use-insights-data';
import type { RangeDays } from '@/features/insights/utils/insights-utils';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { useState } from 'react';
import { Navigate } from 'react-router';
import { ErrorPage } from './error-page';

export const InsightsPage = () => {
    const { activeProfile } = useAuth();
    const [rangeDays, setRangeDays] = useState<RangeDays>(30);
    const data = useInsightsData(rangeDays);
    const reduceMotion = usePrefersReducedMotion();
    const animate = !reduceMotion;

    // Insights disabled for this profile → the feature is hidden wholesale, so
    // the route bounces to Today (the nav tab is already gone). Mirrors the
    // habits dashboard.
    if (activeProfile && activeProfile.insights_enabled === false) {
        return <Navigate to='/' replace />;
    }

    if (data.isError) {
        return <ErrorPage message='Error loading insights' />;
    }

    // Only blank the content on the very first load; on a range switch the
    // task/time/project caches persist, so we keep the charts mounted and let
    // them refresh in place instead of flashing a skeleton.
    const initialLoading = data.isLoading && !data.hasAnyData;

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <header className='mb-[26px] flex flex-wrap items-start justify-between gap-4'>
                    <div>
                        <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                            Insights
                        </h1>
                        <p className='mt-0.5 font-mono text-[12px] text-text-muted'>
                            Your last {rangeDays} days at a glance
                        </p>
                    </div>
                    <RangeToggle value={rangeDays} onChange={setRangeDays} />
                </header>

                {initialLoading ? (
                    <div className='flex flex-col gap-5'>
                        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className='h-[92px] animate-pulse rounded-card border'
                                    style={{
                                        backgroundColor: 'var(--surface-card-bg)',
                                        borderColor: 'var(--surface-card-border)'
                                    }}
                                />
                            ))}
                        </div>
                        <div className='grid gap-4 lg:grid-cols-2'>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className='h-[248px] animate-pulse rounded-card border'
                                    style={{
                                        backgroundColor: 'var(--surface-card-bg)',
                                        borderColor: 'var(--surface-card-border)'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ) : !data.hasAnyData ? (
                    <div
                        className='rounded-card border p-10 text-center'
                        style={{
                            backgroundColor: 'var(--surface-card-bg)',
                            borderColor: 'var(--surface-card-border)'
                        }}
                    >
                        <p className='font-display text-[15px] text-text-secondary'>
                            Nothing to show yet
                        </p>
                        <p className='mt-1 font-mono text-[12px] text-text-muted'>
                            Complete tasks, track time, or check off habits and your trends will
                            appear here.
                        </p>
                    </div>
                ) : (
                    <div className='flex flex-col gap-5'>
                        <InsightsSummaryCards data={data} />
                        <div className='grid gap-4 lg:grid-cols-2'>
                            <TaskThroughputChart
                                buckets={data.buckets}
                                series={data.tasksCompletedSeries}
                                total={data.tasksCompleted}
                                animate={animate}
                            />
                            <TimeTrackedChart
                                buckets={data.buckets}
                                series={data.timeTrackedSeries}
                                totalSeconds={data.timeTrackedSeconds}
                                animate={animate}
                            />
                            <HabitPerformanceChart habits={data.habitPerf} />
                            <TimeByProjectChart projects={data.projectTime} animate={animate} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
