import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_TASK_CONTROLS, type TaskControlsState } from '../utils/task-controls';

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
            if (raw) setControls({ ...DEFAULT_TASK_CONTROLS, ...JSON.parse(raw) });
            else setControls(DEFAULT_TASK_CONTROLS);
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
