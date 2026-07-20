import type { ProjectRead, TaskRead } from '@/api';
import { STATUS_META } from '@/features/tasks/components/status-config';
import { PRIORITY_LEVELS } from '@/features/tasks/utils/priority-config';
import { useTimeEntrySummary } from '@/features/time-entries/api/get-time-entries';
import { formatHumanDuration } from '@/features/time-entries/utils/format-duration';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { computeProjectAnalytics, type ThroughputWeek } from '../utils/project-analytics';

const HIDE_KEY = 'project_hide_analytics';

const sectionLabelClass =
    'font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted';
const tileLabelClass = 'font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

type Segment = { label: string; color: string; count: number };

/** A single stacked proportion bar + a wrapped colored-dot legend beneath it. */
const MixBlock = ({ title, segments }: { title: string; segments: Segment[] }) => {
    const total = segments.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return null;
    return (
        <div>
            <div className='mb-2 flex items-baseline justify-between'>
                <h3 className={tileLabelClass}>{title}</h3>
                <span className='font-mono text-[11px] text-text-faint'>{total}</span>
            </div>
            <div className='flex h-2.5 w-full overflow-hidden rounded-full'>
                {segments.map((s) => (
                    <div
                        key={s.label}
                        style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
                        title={`${s.label}: ${s.count}`}
                    />
                ))}
            </div>
            <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1'>
                {segments.map((s) => (
                    <span
                        key={s.label}
                        className='flex items-center gap-1.5 font-mono text-[11px] text-text-muted'
                    >
                        <span
                            className='h-2 w-2 shrink-0 rounded-full'
                            style={{ backgroundColor: s.color }}
                        />
                        {s.label} {s.count}
                    </span>
                ))}
            </div>
        </div>
    );
};

/** Tasks-completed-per-week bar chart (recharts), themed to the project color. */
const ThroughputChart = ({ weeks, color }: { weeks: ThroughputWeek[]; color: string }) => {
    const totalDone = weeks.reduce((sum, w) => sum + w.count, 0);
    return (
        <div>
            <div className='mb-2 flex items-baseline justify-between'>
                <h3 className={tileLabelClass}>Throughput</h3>
                <span className='font-mono text-[11px] text-text-faint'>{totalDone} done · 8 wks</span>
            </div>
            {totalDone === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    No tasks completed in the last 8 weeks.
                </p>
            ) : (
                <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer>
                        <BarChart data={weeks} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
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
                                labelFormatter={(label) => `Week of ${label}`}
                            />
                            <Bar dataKey='count' radius={[3, 3, 0, 0]} fill={color} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

/**
 * Collapsible per-project analytics panel: completion, tracked time (with the
 * heaviest tasks), status/priority mix and weekly throughput. All computed
 * client-side from the project's counts, the loaded task list and the time
 * summary. Stacks into the project page's scroll like the time log below it.
 */
export const ProjectAnalytics = ({ project, tasks }: { project: ProjectRead; tasks: TaskRead[] }) => {
    const summaryQuery = useTimeEntrySummary({ profileId: project.profile_id });

    const data = useMemo(
        () => computeProjectAnalytics(tasks, summaryQuery.data, project, new Date()),
        [tasks, summaryQuery.data, project]
    );

    // Collapse state persisted per browser (defaults open), same pattern as the
    // Today "Whenever" band toggle.
    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        setCollapsed(localStorage.getItem(HIDE_KEY) === '1');
    }, []);
    const toggle = () =>
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem(HIDE_KEY, next ? '1' : '0');
            return next;
        });

    const statusSegments: Segment[] = data.statusMix.map((s) => ({
        label: STATUS_META[s.status as keyof typeof STATUS_META]?.label ?? `Status ${s.status}`,
        color: STATUS_META[s.status as keyof typeof STATUS_META]?.color ?? 'var(--color-text-muted)',
        count: s.count
    }));
    const prioritySegments: Segment[] = data.priorityMix.map((p) => ({
        label: PRIORITY_LEVELS[p.priority]?.label ?? `P${p.priority}`,
        color: PRIORITY_LEVELS[p.priority]?.accent ?? 'var(--color-text-muted)',
        count: p.count
    }));

    return (
        <section
            className='mt-[30px] rounded-card border p-4'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            <button
                type='button'
                onClick={toggle}
                aria-expanded={!collapsed}
                className='flex w-full items-center justify-between'
            >
                <h2 className={sectionLabelClass}>Analytics</h2>
                <ChevronDown
                    size={16}
                    className={`text-text-faint transition-transform ${collapsed ? '' : 'rotate-180'}`}
                />
            </button>

            {!collapsed &&
                (!data.hasTaskData && data.total === 0 ? (
                    <p className='mt-3 font-mono text-[12px] text-text-faint'>
                        Add tasks to see analytics.
                    </p>
                ) : (
                    <div className='mt-4 flex flex-col gap-6'>
                        <div className='grid gap-6 sm:grid-cols-2'>
                            {/* Completion */}
                            <div>
                                <h3 className={tileLabelClass}>Completion</h3>
                                <div className='mt-1 flex items-baseline gap-2'>
                                    <span className='font-display text-[28px] font-semibold leading-none text-text-primary'>
                                        {data.donePct}%
                                    </span>
                                    <span className='font-mono text-[11px] text-text-muted'>
                                        {data.done} of {data.total} done
                                    </span>
                                </div>
                                <div
                                    className='mt-2.5 h-2 w-full overflow-hidden rounded-full'
                                    style={{ backgroundColor: 'var(--surface-input-bg)' }}
                                >
                                    <div
                                        className='h-full rounded-full'
                                        style={{ width: `${data.donePct}%`, backgroundColor: project.color }}
                                    />
                                </div>
                            </div>

                            {/* Time tracked */}
                            <div>
                                <h3 className={tileLabelClass}>Time tracked</h3>
                                <div className='mt-1 flex items-baseline gap-2'>
                                    <span className='font-display text-[28px] font-semibold leading-none text-text-primary'>
                                        {formatHumanDuration(data.totalSeconds)}
                                    </span>
                                    <span className='font-mono text-[11px] text-text-muted'>
                                        {data.entryCount} {data.entryCount === 1 ? 'entry' : 'entries'}
                                    </span>
                                </div>
                                {data.topTasksByTime.length > 0 && (
                                    <ul className='mt-2.5 flex flex-col gap-1'>
                                        {data.topTasksByTime.slice(0, 3).map((t) => (
                                            <li
                                                key={t.taskId}
                                                className='flex items-center justify-between gap-2 font-mono text-[11px] text-text-muted'
                                            >
                                                <span className='truncate'>{t.title}</span>
                                                <span className='shrink-0 tabular-nums text-text-faint'>
                                                    {formatHumanDuration(t.seconds)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {(statusSegments.length > 0 || prioritySegments.length > 0) && (
                            <div className='grid gap-6 sm:grid-cols-2'>
                                <MixBlock title='Status' segments={statusSegments} />
                                <MixBlock title='Priority' segments={prioritySegments} />
                            </div>
                        )}

                        <ThroughputChart weeks={data.throughput} color={project.color} />
                    </div>
                ))}
        </section>
    );
};
