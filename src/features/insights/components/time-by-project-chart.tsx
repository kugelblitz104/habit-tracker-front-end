import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatHumanDuration } from '@/features/time-entries/utils/format-duration';
import type { ProjectTime } from '../hooks/use-insights-data';

const titleClass = 'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted';

/**
 * Windowed tracked time split by project as a donut, with a ranked legend list
 * beside it. Each slice/dot uses the project's own color (untethered time falls
 * under "No project").
 */
export const TimeByProjectChart = ({
    projects,
    animate
}: {
    projects: ProjectTime[];
    animate: boolean;
}) => {
    const total = projects.reduce((sum, p) => sum + p.seconds, 0);
    return (
        <section
            className='rounded-card border p-4'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            <div className='mb-3 flex items-baseline justify-between'>
                <h2 className={titleClass}>Time by project</h2>
                <span className='font-mono text-[11px] text-text-faint'>
                    {total > 0 ? formatHumanDuration(total) : '0m'}
                </span>
            </div>
            {total === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    No time tracked in this window.
                </p>
            ) : (
                <div className='flex flex-wrap items-center gap-4'>
                    <div className='shrink-0' style={{ width: 160, height: 160 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={projects}
                                    dataKey='seconds'
                                    nameKey='name'
                                    cx='50%'
                                    cy='50%'
                                    innerRadius={44}
                                    outerRadius={76}
                                    paddingAngle={projects.length > 1 ? 2 : 0}
                                    stroke='var(--surface-card-bg)'
                                    strokeWidth={2}
                                    isAnimationActive={animate}
                                >
                                    {projects.map((p) => (
                                        <Cell key={String(p.projectId)} fill={p.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg)',
                                        border: '1px solid var(--surface-card-border)',
                                        borderRadius: 8,
                                        fontSize: 11
                                    }}
                                    labelStyle={{ color: 'var(--color-text-muted)' }}
                                    itemStyle={{ color: 'var(--color-text-secondary)' }}
                                    formatter={(value, name) => [
                                        formatHumanDuration(Number(value) || 0),
                                        name
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className='flex min-w-0 flex-1 flex-col gap-1.5'>
                        {projects.slice(0, 6).map((p) => (
                            <li
                                key={String(p.projectId)}
                                className='flex items-center justify-between gap-2 py-0.5 font-mono text-[11.5px]'
                            >
                                <span className='flex min-w-0 items-center gap-2 text-text-muted'>
                                    <span
                                        className='h-2 w-2 shrink-0 rounded-full'
                                        style={{ backgroundColor: p.color }}
                                    />
                                    <span className='truncate'>{p.name}</span>
                                </span>
                                <span className='shrink-0 tabular-nums text-text-faint'>
                                    {formatHumanDuration(p.seconds)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};
