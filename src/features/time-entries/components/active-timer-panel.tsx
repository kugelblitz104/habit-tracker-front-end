import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useAuth } from '@/lib/auth-context';
import { Pause, Timer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import { useActiveTimeEntry } from '../api/get-time-entries';
import { useStopTimeEntry } from '../api/stop-time-entries';
import { useUpdateTimeEntry } from '../api/update-time-entries';
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds';
import { formatClock } from '../utils/format-duration';

/**
 * Compact active-timer indicator for the Today surface: shows the running
 * timer's live elapsed + attached task with a Stop control, or a slim link to
 * the timer screen when nothing is running. Reads the same cached active-entry
 * query the timer page uses, so the two stay in sync.
 */
export const ActiveTimerPanel = () => {
    const { activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    const activeQuery = useActiveTimeEntry({ profileId });
    const tasksQuery = useTasks({ profileId });
    const projectsQuery = useProjects({ profileId, includeArchived: true });
    const stopTimeEntry = useStopTimeEntry();
    const updateTimeEntry = useUpdateTimeEntry();

    const active = activeQuery.data ?? null;
    const elapsed = useElapsedSeconds(active?.started_at, !!active);

    // Editable label for the running entry.
    const [labelDraft, setLabelDraft] = useState('');
    useEffect(() => {
        setLabelDraft(active?.label ?? '');
    }, [active?.id, active?.label]);

    const commitLabel = () => {
        if (!active) return;
        const next = labelDraft.trim();
        if (next === (active.label ?? '')) return;
        updateTimeEntry.mutate({ entryId: active.id, data: { label: next || null } });
    };

    // What the running timer is attached to (task, adhoc project) plus its label.
    const context = useMemo(() => {
        if (!active) return null;
        if (active.task_id != null) {
            return tasksQuery.data?.tasks?.find((t) => t.id === active.task_id)?.title ?? null;
        }
        if (active.project_id != null) {
            return (
                projectsQuery.data?.projects?.find((p) => p.id === active.project_id)?.name ?? null
            );
        }
        return null;
    }, [active, tasksQuery.data, projectsQuery.data]);

    const handleStop = () => {
        if (!active || stopTimeEntry.isPending) return;
        stopTimeEntry.mutate(active.id, {
            onSuccess: () => toast.success('Timer stopped'),
            onError: () => toast.error('Failed to stop timer.')
        });
    };

    return (
        <section className='mb-[30px]'>
            <div className='mb-2.5 flex items-center gap-2'>
                <h2 className='font-mono text-[11.5px] uppercase tracking-[0.16em] text-text-muted'>
                    Timer
                </h2>
            </div>

            {active ? (
                <div
                    className='flex items-center justify-between gap-3 rounded-card border px-4 py-3'
                    style={{
                        backgroundColor: 'var(--surface-card-bg)',
                        borderColor: 'var(--color-now-accent)'
                    }}
                >
                    <div className='flex min-w-0 items-center gap-3'>
                        <span
                            className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full'
                            style={{ backgroundColor: 'rgba(255,255,255,.05)' }}
                        >
                            <Timer size={16} style={{ color: 'var(--color-now-accent)' }} />
                        </span>
                        <div className='min-w-0'>
                            <div className='font-mono text-[17px] font-semibold tabular-nums text-text-primary'>
                                {formatClock(elapsed)}
                            </div>
                            <div className='mt-0.5 flex min-w-0 items-center gap-1.5'>
                                <input
                                    type='text'
                                    value={labelDraft}
                                    onChange={(e) => setLabelDraft(e.target.value)}
                                    onBlur={commitLabel}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                    }}
                                    placeholder='Add a label…'
                                    aria-label='Timer label'
                                    className='min-w-0 flex-1 bg-transparent font-mono text-[11px] text-text-secondary outline-none placeholder:text-text-faint'
                                />
                                {context && (
                                    <span className='shrink-0 truncate font-mono text-[11px] text-text-faint'>
                                        · {context}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className='flex shrink-0 items-center gap-2'>
                        <button
                            type='button'
                            onClick={handleStop}
                            disabled={stopTimeEntry.isPending}
                            className='inline-flex items-center gap-1.5 rounded-button border px-3 py-1.5 font-display text-[12.5px] font-semibold transition-colors hover:brightness-125 disabled:opacity-50'
                            style={{
                                borderColor: 'var(--danger-border)',
                                color: 'var(--color-danger)'
                            }}
                        >
                            <Pause size={13} />
                            Stop
                        </button>
                        <Link
                            to='/timer'
                            className='rounded-button px-3 py-1.5 font-display text-[12.5px] text-text-muted transition-colors hover:text-text-secondary'
                        >
                            Open
                        </Link>
                    </div>
                </div>
            ) : (
                <Link
                    to='/timer'
                    className='flex items-center gap-2 rounded-card border px-4 py-3 font-mono text-[12px] text-text-faint transition-colors hover:text-text-muted'
                    style={{
                        backgroundColor: 'var(--surface-card-bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    <Timer size={14} />
                    No timer running — start one
                </Link>
            )}
        </section>
    );
};
