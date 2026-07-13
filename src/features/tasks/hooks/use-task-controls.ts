import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_TASK_CONTROLS, type TaskControlsState } from '../utils/task-controls';

/**
 * Reconcile a parsed localStorage payload against the current shape. Older
 * persisted state used single-select `filterStatus` / `filterPriority`
 * (number | 'all') instead of today's `filterStatuses` / `filterPriorities`
 * arrays — rather than attempt a value-by-value migration, any stored filter
 * that isn't already the current array shape is discarded in favor of the
 * (safe) default, so old data never crashes the checkbox filters.
 */
const sanitizeControls = (raw: unknown): TaskControlsState => {
    const parsed = (raw ?? {}) as Partial<Record<string, unknown>>;
    const next: TaskControlsState = { ...DEFAULT_TASK_CONTROLS };

    if (parsed.groupBy) next.groupBy = parsed.groupBy as TaskControlsState['groupBy'];
    if (parsed.sortBy) next.sortBy = parsed.sortBy as TaskControlsState['sortBy'];
    if (parsed.sortDir) next.sortDir = parsed.sortDir as TaskControlsState['sortDir'];
    if (
        typeof parsed.filterProjectId === 'number' ||
        parsed.filterProjectId === 'none' ||
        parsed.filterProjectId === 'all'
    ) {
        next.filterProjectId = parsed.filterProjectId as TaskControlsState['filterProjectId'];
    }
    if (Array.isArray(parsed.filterPriorities) && parsed.filterPriorities.every((v) => typeof v === 'number')) {
        next.filterPriorities = parsed.filterPriorities as number[];
    }
    if (Array.isArray(parsed.filterStatuses) && parsed.filterStatuses.every((v) => typeof v === 'number')) {
        next.filterStatuses = parsed.filterStatuses as number[];
    }
    return next;
};

/**
 * Sort/group/filter control state for a flat task surface, persisted per browser
 * under `storageKey` so the All-tasks view and each project view keep their own
 * layout. Hydrated after mount (SSR renders the defaults).
 */
export const useTaskControls = (storageKey: string) => {
    const [controls, setControls] = useState<TaskControlsState>(DEFAULT_TASK_CONTROLS);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            setControls(raw ? sanitizeControls(JSON.parse(raw)) : DEFAULT_TASK_CONTROLS);
        } catch {
            setControls(DEFAULT_TASK_CONTROLS);
        }
    }, [storageKey]);

    const update = useCallback(
        (next: TaskControlsState) => {
            setControls(next);
            try {
                localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
                /* ignore persistence failures */
            }
        },
        [storageKey]
    );

    return [controls, update] as const;
};
