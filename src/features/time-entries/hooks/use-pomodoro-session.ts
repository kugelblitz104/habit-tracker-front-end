import type { ProfileRead } from '@/api';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { useStopTimeEntry } from '../api/stop-time-entries';

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

type UsePomodoroSessionOptions = {
    /** Profile carrying the pomodoro minute/cycle settings (falls back to defaults). */
    profile: ProfileRead | null;
    /** Id of the running entry, or undefined when idle — resets the auto-stop guard on change. */
    activeId: number | undefined;
    running: boolean;
    isPomodoro: boolean;
    /** Elapsed seconds of the running entry (0 when idle). */
    elapsed: number;
    /** Stops the running entry; called with the active id once the work session completes. */
    stopEntry: ReturnType<typeof useStopTimeEntry>['mutate'];
};

/**
 * Local pomodoro state machine layered on top of the server-tracked stopwatch
 * entry: the work-session length comes from the profile's pomodoro settings,
 * but breaks are local-only (no time entry). Auto-stops the running entry once
 * it reaches the configured work length, then counts down a break (short, or
 * long every `cycles` sessions) with toast + desktop notifications.
 */
export const usePomodoroSession = ({
    profile,
    activeId,
    running,
    isPomodoro,
    elapsed,
    stopEntry
}: UsePomodoroSessionOptions) => {
    const work = profile?.pomodoro_work_minutes ?? POMODORO_DEFAULTS.work;
    const breakMin = profile?.pomodoro_break_minutes ?? POMODORO_DEFAULTS.break;
    const longBreakMin = profile?.pomodoro_long_break_minutes ?? POMODORO_DEFAULTS.longBreak;
    const cycles = profile?.pomodoro_cycles ?? POMODORO_DEFAULTS.cycles;
    const workSeconds = work * 60;

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
    }, [activeId]);

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
        if (activeId === undefined) return;
        stopEntry(activeId, {
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

    const skipBreak = () => setBreakUntil(null);

    return {
        work,
        breakMin,
        longBreakMin,
        cycles,
        workSeconds,
        onBreak,
        breakRemaining,
        breakIsLong,
        completedWork,
        skipBreak
    };
};
