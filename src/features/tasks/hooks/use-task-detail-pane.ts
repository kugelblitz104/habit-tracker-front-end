import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Shared state for the Today + project task surfaces: the inline read-only notes
 * peek and the master-detail edit pane. Notes and edit are independent — opening
 * one no longer closes the other.
 *
 * `isWide` (lg/xl) decides how the editor renders: a sticky right-side detail
 * pane on wide screens. On narrow screens the editor is a full-page screen
 * instead (mirroring habit detail), so selecting a task navigates to
 * `/tasks/:taskId` rather than opening an in-page overlay. The routes own the
 * task lookup; this hook only tracks which id is open in the wide pane.
 */
export const useTaskDetailPane = () => {
    const layout = useResponsiveLayout();
    const isWide = layout === 'lg' || layout === 'xl';
    const navigate = useNavigate();
    const location = useLocation();

    const [notesTaskId, setNotesTaskId] = useState<number | null>(null);
    const [selectedEditTaskId, setSelectedEditTaskId] = useState<number | null>(null);

    // The meta-row "notes" chip toggles the inline read-only panel.
    const toggleNotes = useCallback((taskId: number) => {
        setNotesTaskId((current) => (current === taskId ? null : taskId));
    }, []);

    // Tapping a title edits the task. On wide screens it selects the task for the
    // sticky pane (tapping the open one closes it). On narrow screens there is no
    // pane — navigate to the full-page edit screen, remembering the current page
    // (Today `/` or `/projects/:id`) so the screen can offer origin-aware back-nav.
    const selectEdit = useCallback(
        (taskId: number) => {
            if (isWide) {
                setSelectedEditTaskId((current) => (current === taskId ? null : taskId));
                return;
            }
            navigate(`/tasks/${taskId}`, { state: { from: location.pathname } });
        },
        [isWide, navigate, location.pathname]
    );

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
