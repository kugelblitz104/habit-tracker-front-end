import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { useMemo, useState } from 'react';

/** How long a closed row is held for its exit; the row's own fold must end inside it. */
export const EXIT_MS = 700;

type Held = { task: TaskRead; index: number; status: TaskStatus };

/** `tasks` with each held row the list has already dropped put back at its old index. */
export const withHeldRows = (tasks: TaskRead[], held: Iterable<Held>): TaskRead[] => {
    const missing = [...held]
        .filter((h) => !tasks.some((t) => t.id === h.task.id))
        .sort((a, b) => a.index - b.index);
    if (missing.length === 0) return tasks;
    const out = [...tasks];
    for (const h of missing) out.splice(Math.min(h.index, out.length), 0, h.task);
    return out;
};

/**
 * Holds a row the user just closed (Done / Cancelled) in place for `EXIT_MS`,
 * so it can strike through and fold away even when the refetch drops it from
 * `tasks` first. The status write is the caller's and fires immediately; this
 * only keeps the stale row on screen, at its old index, with the picked status
 * for display. Reduced-motion users get no hold.
 */
export const useExitingRows = (tasks: TaskRead[]) => {
    const [held, setHeld] = useState<ReadonlyMap<number, Held>>(new Map());

    const holdIfClosing = (task: TaskRead, status: TaskStatus) => {
        if (status !== TaskStatus.DONE && status !== TaskStatus.CANCELLED) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const index = Math.max(
            0,
            tasks.findIndex((t) => t.id === task.id)
        );
        setHeld((prev) => new Map(prev).set(task.id, { task, index, status }));
        window.setTimeout(
            () =>
                setHeld((prev) => {
                    const next = new Map(prev);
                    next.delete(task.id);
                    return next;
                }),
            EXIT_MS
        );
    };

    const rows = useMemo(() => withHeldRows(tasks, held.values()), [tasks, held]);

    return { rows, exitingStatus: (id: number) => held.get(id)?.status, holdIfClosing };
};
