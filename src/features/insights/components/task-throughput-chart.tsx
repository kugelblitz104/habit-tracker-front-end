import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
    CHART_CURSOR_FILL,
    CHART_TOOLTIP_CONTENT_STYLE,
    CHART_TOOLTIP_ITEM_STYLE,
    CHART_TOOLTIP_LABEL_STYLE
} from '@/components/ui/chart-theme';
import type { Bucket } from '../utils/insights-utils';
import { ChartCard } from './chart-card';

/** Completed tasks per bucket (day or week, depending on the range). */
export const TaskThroughputChart = ({
    buckets,
    series,
    total,
    animate
}: {
    buckets: Bucket[];
    series: number[];
    total: number;
    animate: boolean;
}) => {
    const data = buckets.map((b, i) => ({ label: b.label, value: series[i] ?? 0 }));
    return (
        <ChartCard
            title='Tasks completed'
            meta={`${total} total`}
            isEmpty={total === 0}
            emptyMessage='No tasks completed in this window.'
        >
            <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                        <XAxis
                            dataKey='label'
                            tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            width={30}
                            tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={CHART_CURSOR_FILL}
                            contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
                            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                            formatter={(value) => [value ?? 0, 'completed']}
                        />
                        <Bar
                            dataKey='value'
                            radius={[3, 3, 0, 0]}
                            fill='var(--color-now-accent)'
                            isAnimationActive={animate}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
};
