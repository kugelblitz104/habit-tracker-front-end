import { useCallback, useState } from 'react';

/**
 * Multi-select state for the flat task surfaces (All-tasks + project view).
 * A selection-mode flag reveals per-card checkboxes and the floating bulk-action
 * bar; the selected set is tracked by task id. Exiting selection mode always
 * clears the set so a stale selection can't linger invisibly.
 */
export const useTaskSelection = () => {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const toggle = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const selectMany = useCallback((ids: number[]) => setSelectedIds(new Set(ids)), []);
    const clear = useCallback(() => setSelectedIds(new Set()), []);

    const exit = useCallback(() => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    const toggleMode = useCallback(
        () =>
            setSelectionMode((on) => {
                if (on) setSelectedIds(new Set());
                return !on;
            }),
        []
    );

    return { selectionMode, selectedIds, toggle, selectMany, clear, exit, toggleMode };
};
