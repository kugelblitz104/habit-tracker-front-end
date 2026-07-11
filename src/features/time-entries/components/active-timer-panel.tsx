import { useAuth } from '@/lib/auth-context';
import { Pause, Timer } from 'lucide-react';
import { Link } from 'react-router';
import { useActiveTimeEntry } from '../api/get-time-entries';
import { useEditableEntryLabel } from '../hooks/use-editable-entry-label';
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds';
import { useEntryContextName } from '../hooks/use-entry-context-name';
import { useStopActiveTimer } from '../hooks/use-stop-active-timer';
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
    const active = activeQuery.data ?? null;
    const elapsed = useElapsedSeconds(active?.started_at, !!active);

    // Editable label for the running entry.
    const {
        draft: labelDraft,
        setDraft: setLabelDraft,
        commit: commitLabel
    } = useEditableEntryLabel(active);

    // What the running timer is attached to (task, adhoc project).
    const contextNameFor = useEntryContextName({ profileId, includeProjects: true });
    const context = active ? contextNameFor(active) : null;

    const { handleStop, isPending: isStopping } = useStopActiveTimer(active);

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
                            disabled={isStopping}
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
