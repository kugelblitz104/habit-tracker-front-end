import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bucket } from '../utils/insights-utils';

const titleClass = 'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted';

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
        <section
            className='rounded-card border p-4'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            <div className='mb-3 flex items-baseline justify-between'>
                <h2 className={titleClass}>Tasks completed</h2>
                <span className='font-mono text-[11px] text-text-faint'>{total} total</span>
            </div>
            {total === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    No tasks completed in this window.
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
                                allowDecimals={false}
                                width={30}
                                tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                                axisLine={false}
                                tickLine={false}
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
            )}
        </section>
    );
};
