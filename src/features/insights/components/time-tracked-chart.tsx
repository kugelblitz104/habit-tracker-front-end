import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
    CHART_CURSOR_FILL,
    CHART_TOOLTIP_CONTENT_STYLE,
    CHART_TOOLTIP_ITEM_STYLE,
    CHART_TOOLTIP_LABEL_STYLE
} from '@/components/ui/chart-theme';
import { formatHumanDuration } from '@/features/time-entries/utils/format-duration';
import type { Bucket } from '../utils/insights-utils';
import { ChartCard } from './chart-card';

/** Tracked time per bucket. Bars are plotted in hours; the tooltip shows the
 *  human total ("1h 25m") from the underlying seconds. */
export const TimeTrackedChart = ({
    buckets,
    series,
    totalSeconds,
    animate
}: {
    buckets: Bucket[];
    series: number[];
    totalSeconds: number;
    animate: boolean;
}) => {
    const data = buckets.map((b, i) => {
        const seconds = series[i] ?? 0;
        return { label: b.label, hours: +(seconds / 3600).toFixed(2), seconds };
    });
    return (
        <ChartCard
            title='Time tracked'
            meta={totalSeconds > 0 ? formatHumanDuration(totalSeconds) : '0m'}
            isEmpty={totalSeconds === 0}
            emptyMessage='No time tracked in this window.'
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
                            width={30}
                            tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                            axisLine={false}
                            tickLine={false}
                            unit='h'
                        />
                        <Tooltip
                            cursor={CHART_CURSOR_FILL}
                            contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
                            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                            formatter={(_value, _name, item) => [
                                formatHumanDuration(item?.payload?.seconds ?? 0),
                                'tracked'
                            ]}
                        />
                        <Bar
                            dataKey='hours'
                            radius={[3, 3, 0, 0]}
                            fill='var(--color-status-scheduled)'
                            isAnimationActive={animate}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
};
