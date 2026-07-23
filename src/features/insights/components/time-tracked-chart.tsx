import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatHumanDuration } from '@/features/time-entries/utils/format-duration';
import type { Bucket } from '../utils/insights-utils';

const titleClass = 'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted';

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
        <section
            className='rounded-card border p-4'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            <div className='mb-3 flex items-baseline justify-between'>
                <h2 className={titleClass}>Time tracked</h2>
                <span className='font-mono text-[11px] text-text-faint'>
                    {totalSeconds > 0 ? formatHumanDuration(totalSeconds) : '0m'}
                </span>
            </div>
            {totalSeconds === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    No time tracked in this window.
                </p>
            ) : (
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
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                contentStyle={{
                                    backgroundColor: 'var(--bg)',
                                    border: '1px solid var(--surface-card-border)',
                                    borderRadius: 8,
                                    fontSize: 11
                                }}
                                labelStyle={{ color: 'var(--color-text-muted)' }}
                                itemStyle={{ color: 'var(--color-text-secondary)' }}
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
            )}
        </section>
    );
};
