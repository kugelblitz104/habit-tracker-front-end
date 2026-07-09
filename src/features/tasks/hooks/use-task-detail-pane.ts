import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { useCallback, useState } from 'react';

/**
 * Shared state for the Today + project task surfaces: the inline read-only notes
 * peek and the master-detail edit pane. Notes and edit are independent — opening
 * one no longer closes the other.
 *
 * `isWide` (lg/xl) decides how the editor renders: a sticky right-side detail
 * pane on wide screens, a slide-over overlay on narrow ones. The routes own the
 * task lookup; this hook only tracks which ids are open.
 */
export const useTaskDetailPane = () => {
    const layout = useResponsiveLayout();
    const isWide = layout === 'lg' || layout === 'xl';

    const [notesTaskId, setNotesTaskId] = useState<number | null>(null);
    const [selectedEditTaskId, setSelectedEditTaskId] = useState<number | null>(null);

    // The meta-row "notes" chip toggles the inline read-only panel.
    const toggleNotes = useCallback((taskId: number) => {
        setNotesTaskId((current) => (current === taskId ? null : taskId));
    }, []);

    // Tapping a title selects it for the detail pane; tapping the open one closes.
    const selectEdit = useCallback((taskId: number) => {
        setSelectedEditTaskId((current) => (current === taskId ? null : taskId));
    }, []);

    const closeEdit = useCallback(() => setSelectedEditTaskId(null), []);

    return {
        isWide,
        notesTaskId,
        selectedEditTaskId,
        toggleNotes,
        selectEdit,
        closeEdit
    };
};
