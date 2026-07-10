import type { ProfileRead } from '@/api';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { TimeEntryKind } from '@/types/types';
import { Coffee, Pause, Play, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useCreateTimeEntry } from '../api/create-time-entries';
import { useActiveTimeEntry } from '../api/get-time-entries';
import { useStopTimeEntry } from '../api/stop-time-entries';
import { useUpdateTimeEntry } from '../api/update-time-entries';
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds';
import { formatClock } from '../utils/format-duration';
import { LabelInput } from './label-input';
import { ProjectSelect } from './project-select';
import { TaskSelect } from './task-select';

type TimerPanelProps = {
    profile: ProfileRead | null;
    profileId: number | null | undefined;
};

const POMODORO_DEFAULTS = {
    work: 25,
    break: 5,
    longBreak: 15,
    cycles: 4
};

/** Best-effort completion alert: always toast, plus a desktop notification when granted. */
const notify = (title: string, body: string) => {
    toast.success(`${title} — ${body}`);
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, { body });
            } catch {
                // Notification construction can throw on some platforms; the toast covers it.
            }
        }
    }
};

/**
 * The timer centerpiece: a stopwatch or pomodoro session, optionally attached to
 * a task. The running session is a server-side time entry (one per profile), so
 * elapsed time is derived from its `started_at` and survives navigation — this
 * panel just renders and controls it. Pomodoro breaks are local-only (no entry).
 */
export const TimerPanel = ({ profile, profileId }: TimerPanelProps) => {
    const activeQuery = useActiveTimeEntry({ profileId });
    const createTimeEntry = useCreateTimeEntry();
    const stopTimeEntry = useStopTimeEntry();
    const updateTimeEntry = useUpdateTimeEntry();

    const active = activeQuery.data ?? null;
    const running = !!active;

    // Editable label for the running entry, synced when the active entry changes.
    const [runningLabel, setRunningLabel] = useState('');
    useEffect(() => {
        setRunningLabel(active?.label ?? '');
    }, [active?.id, active?.label]);

    const commitRunningLabel = () => {
        if (!active) return;
        const next = runningLabel.trim();
        if (next === (active.label ?? '')) return;
        updateTimeEntry.mutate({ entryId: active.id, data: { label: next || null } });
    };

    // Mode is user-chosen while idle, but follows the running entry's kind so a
    // timer started elsewhere (e.g. Today) shows correctly here.
    const [selectedMode, setSelectedMode] = useState<TimeEntryKind>(TimeEntryKind.STOPWATCH);
    const mode = running
        ? ((active?.kind ?? TimeEntryKind.STOPWATCH) as TimeEntryKind)
        : selectedMode;
    const isPomodoro = mode === TimeEntryKind.POMODORO;

    // Idle target: attach the next timer to a task, or adhoc to a project.
    const [targetType, setTargetType] = useState<'task' | 'project'>('task');
    const [taskId, setTaskId] = useState<number | null>(null);
    const [projectId, setProjectId] = useState<number | null>(null);
    const [label, setLabel] = useState('');

    const work = profile?.pomodoro_work_minutes ?? POMODORO_DEFAULTS.work;
    const breakMin = profile?.pomodoro_break_minutes ?? POMODORO_DEFAULTS.break;
    const longBreakMin = profile?.pomodoro_long_break_minutes ?? POMODORO_DEFAULTS.longBreak;
    const cycles = profile?.pomodoro_cycles ?? POMODORO_DEFAULTS.cycles;
    const workSeconds = work * 60;

    const elapsed = useElapsedSeconds(active?.started_at, running);

    // Break state (local only — breaks are not tracked as time entries).
    const [breakUntil, setBreakUntil] = useState<number | null>(null);
    const [breakIsLong, setBreakIsLong] = useState(false);
    const [breakRemaining, setBreakRemaining] = useState(0);
    const [completedWork, setCompletedWork] = useState(0);
    const onBreak = breakUntil !== null;

    // Guards a single auto-stop when a pomodoro work session reaches its target.
    const completingRef = useRef(false);
    useEffect(() => {
        // Reset the guard whenever the running entry changes (new session).
        completingRef.current = false;
    }, [active?.id]);

    // Break countdown ticker.
    useEffect(() => {
        if (breakUntil === null) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((breakUntil - Date.now()) / 1000));
            setBreakRemaining(remaining);
            if (remaining <= 0) {
                setBreakUntil(null);
                notify(
                    breakIsLong ? 'Long break over' : 'Break over',
                    'Ready for the next session.'
                );
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [breakUntil, breakIsLong]);

    const beginBreak = () => {
        const nextCompleted = completedWork + 1;
        const isLong = nextCompleted % cycles === 0;
        setCompletedWork(nextCompleted);
        setBreakIsLong(isLong);
        setBreakUntil(Date.now() + (isLong ? longBreakMin : breakMin) * 60 * 1000);
    };

    // Auto-stop a pomodoro work session once it hits the configured length.
    useEffect(() => {
        if (!running || !isPomodoro || onBreak) return;
        if (elapsed < workSeconds || completingRef.current) return;
        completingRef.current = true;
        const entryId = active?.id;
        if (entryId === undefined) return;
        stopTimeEntry.mutate(entryId, {
            onSuccess: () => {
                notify(
                    'Pomodoro complete',
                    `Nice work — time for a ${
                        (completedWork + 1) % cycles === 0 ? 'long break' : 'break'
                    }.`
                );
                beginBreak();
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running, isPomodoro, onBreak, elapsed, workSeconds]);

    const handleStart = () => {
        if (!profileId || createTimeEntry.isPending) return;
        if (isPomodoro && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default')
                Notification.requestPermission().catch(() => {});
        }
        createTimeEntry.mutate(
            {
                profile_id: profileId,
                kind: mode,
                label: label.trim() || null,
                task_id: targetType === 'task' ? taskId : null,
                project_id: targetType === 'project' ? projectId : null
            },
            {
                onError: (error) => toast.error(apiErrorMessage(error, 'Failed to start timer'))
            }
        );
    };

    const handleStop = () => {
        if (!active || stopTimeEntry.isPending) return;
        stopTimeEntry.mutate(active.id, {
            onSuccess: () => toast.success('Timer stopped'),
            onError: (error) => toast.error(apiErrorMessage(error, 'Failed to stop timer'))
        });
    };

    const skipBreak = () => setBreakUntil(null);

    // What the big readout shows and how it's labeled.
    let displaySeconds: number;
    let phaseLabel: string;
    if (onBreak) {
        displaySeconds = breakRemaining;
        phaseLabel = breakIsLong ? 'Long break' : 'Break';
    } else if (running) {
        displaySeconds = isPomodoro ? Math.max(0, workSeconds - elapsed) : elapsed;
        phaseLabel = isPomodoro ? `Focus · Pomodoro ${completedWork + 1}` : 'Stopwatch running';
    } else {
        displaySeconds = isPomodoro ? workSeconds : 0;
        phaseLabel = isPomodoro ? 'Ready to focus' : 'Ready';
    }

    return (
        <section
            className='rounded-card border p-6 md:p-8'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            {/* Mode segmented control — hidden while a session runs or a break counts down */}
            {!running && !onBreak && (
                <div
                    className='mx-auto mb-6 flex w-fit items-center gap-1 rounded-chip border p-1'
                    style={{ borderColor: 'var(--surface-input-border)' }}
                >
                    {[
                        { kind: TimeEntryKind.STOPWATCH, label: 'Stopwatch' },
                        { kind: TimeEntryKind.POMODORO, label: 'Pomodoro' }
                    ].map((option) => {
                        const selected = mode === option.kind;
                        return (
                            <button
                                key={option.kind}
                                type='button'
                                onClick={() => setSelectedMode(option.kind)}
                                aria-pressed={selected}
                                className='rounded-chip px-4 py-1.5 font-display text-[13px] font-medium transition-colors'
                                style={{
                                    backgroundColor: selected
                                        ? 'rgba(255,255,255,.06)'
                                        : 'transparent',
                                    color: selected
                                        ? 'var(--color-now-accent)'
                                        : 'var(--color-text-muted)'
                                }}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Phase label */}
            <div
                className='mb-2 text-center font-mono text-[11.5px] uppercase tracking-[0.16em]'
                style={{
                    color: onBreak ? 'var(--color-soon-text, #cbb994)' : 'var(--color-text-muted)'
                }}
            >
                {phaseLabel}
            </div>

            {/* Big readout */}
            <div
                className='mb-6 text-center font-mono font-semibold tabular-nums'
                style={{
                    fontSize: 'clamp(48px, 12vw, 84px)',
                    lineHeight: 1.05,
                    color: onBreak ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'
                }}
            >
                {formatClock(displaySeconds)}
            </div>

            {/* Target attach + label (idle only). While running these are fixed. */}
            {!onBreak && !running && (
                <div className='mx-auto mb-5 flex max-w-[340px] flex-col gap-2'>
                    <div
                        className='flex items-center gap-1 self-center rounded-chip border p-0.5'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        {[
                            { type: 'task' as const, label: 'Task' },
                            { type: 'project' as const, label: 'Project' }
                        ].map((option) => {
                            const selected = targetType === option.type;
                            return (
                                <button
                                    key={option.type}
                                    type='button'
                                    onClick={() => setTargetType(option.type)}
                                    aria-pressed={selected}
                                    className='rounded-chip px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors'
                                    style={{
                                        backgroundColor: selected
                                            ? 'rgba(255,255,255,.06)'
                                            : 'transparent',
                                        color: selected
                                            ? 'var(--color-now-accent)'
                                            : 'var(--color-text-muted)'
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    {targetType === 'task' ? (
                        <TaskSelect
                            profileId={profileId}
                            value={taskId}
                            onChange={setTaskId}
                            disabled={createTimeEntry.isPending}
                            id='timer-task'
                        />
                    ) : (
                        <ProjectSelect
                            profileId={profileId}
                            value={projectId}
                            onChange={setProjectId}
                            disabled={createTimeEntry.isPending}
                            id='timer-project'
                        />
                    )}
                    <LabelInput
                        profileId={profileId}
                        value={label}
                        onChange={setLabel}
                        onEnter={handleStart}
                        disabled={createTimeEntry.isPending}
                    />
                </div>
            )}

            {/* Editable label for the running timer. */}
            {running && !onBreak && (
                <div className='mx-auto mb-5 max-w-[340px]'>
                    <LabelInput
                        profileId={profileId}
                        value={runningLabel}
                        onChange={setRunningLabel}
                        onEnter={commitRunningLabel}
                        onBlur={commitRunningLabel}
                        placeholder='Label this session…'
                    />
                </div>
            )}

            {/* Controls */}
            <div className='flex items-center justify-center gap-3'>
                {onBreak ? (
                    <button
                        type='button'
                        onClick={skipBreak}
                        className='inline-flex items-center gap-2 rounded-button border px-5 py-2.5 font-display text-[14px] font-semibold text-text-secondary transition-colors hover:text-text-primary'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <SkipForward size={16} />
                        Skip break
                    </button>
                ) : running ? (
                    <button
                        type='button'
                        onClick={handleStop}
                        disabled={stopTimeEntry.isPending}
                        className='inline-flex items-center gap-2 rounded-button border px-6 py-2.5 font-display text-[14px] font-semibold transition-colors hover:brightness-125 disabled:opacity-50'
                        style={{
                            borderColor: 'var(--danger-border)',
                            color: 'var(--color-danger)'
                        }}
                    >
                        <Pause size={16} />
                        Stop
                    </button>
                ) : (
                    <button
                        type='button'
                        onClick={handleStart}
                        disabled={!profileId || createTimeEntry.isPending}
                        className='inline-flex items-center gap-2 rounded-button px-7 py-2.5 font-display text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                        style={{
                            background: 'var(--button-primary-gradient)',
                            color: 'var(--button-primary-text)'
                        }}
                    >
                        <Play size={16} />
                        Start
                    </button>
                )}
            </div>

            {/* Pomodoro cadence hint */}
            {isPomodoro && !running && !onBreak && (
                <p className='mt-4 flex items-center justify-center gap-1.5 font-mono text-[11px] text-text-faint'>
                    <Coffee size={12} />
                    {work}m focus · {breakMin}m break · {longBreakMin}m long break every {cycles}
                </p>
            )}
        </section>
    );
};
