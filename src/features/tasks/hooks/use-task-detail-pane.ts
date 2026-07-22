import { useAuth } from '@/lib/auth-context';
import { registerDetailPane } from '@/lib/detail-pane-registry';
import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    const { activeProfileId } = useAuth();

    const [notesTaskId, setNotesTaskId] = useState<number | null>(null);
    const [subtasksTaskId, setSubtasksTaskId] = useState<number | null>(null);
    const [selectedEditTaskId, setSelectedEditTaskId] = useState<number | null>(null);
    // Whether the selected task should open straight into the edit form (from
    // the context menu's "Edit…"/"Add subtask…") vs. the read-only view.
    const [editIntent, setEditIntent] = useState(false);

    // Selections are profile-scoped: switching profiles must clear any open
    // notes peek / detail / edit pane so a previous profile's task doesn't
    // linger in the pane after the switch.
    useEffect(() => {
        setNotesTaskId(null);
        setSubtasksTaskId(null);
        setSelectedEditTaskId(null);
        setEditIntent(false);
    }, [activeProfileId]);

    // The meta-row "notes" chip toggles the inline read-only panel.
    const toggleNotes = useCallback((taskId: number) => {
        setNotesTaskId((current) => (current === taskId ? null : taskId));
    }, []);

    // The subtask chip toggles a quick complete-off checklist inline.
    const toggleSubtasks = useCallback((taskId: number) => {
        setSubtasksTaskId((current) => (current === taskId ? null : taskId));
    }, []);

    // Tapping a title opens the task detail. On wide screens it selects the task
    // for the sticky pane (tapping the open one closes it, unless it's an edit
    // intent). On narrow screens there is no pane — navigate to the full-page
    // detail screen, remembering the current page (Today `/` or `/projects/:id`)
    // so the screen can offer origin-aware back-nav. `editing` opens edit mode.
    const selectEdit = useCallback(
        (taskId: number, editing = false) => {
            if (isWide) {
                setSelectedEditTaskId((current) =>
                    current === taskId && !editing ? null : taskId
                );
                setEditIntent(editing);
                return;
            }
            navigate(`/tasks/${taskId}`, { state: { from: location.pathname, editing } });
        },
        [isWide, navigate, location.pathname]
    );

    const closeEdit = useCallback(() => {
        setSelectedEditTaskId(null);
        setEditIntent(false);
    }, []);

    // Let the top nav animate this pane closed before a route change (so the
    // view transition doesn't morph from the pane-open layout). A ref keeps the
    // registered `isOpen` reading the latest value without re-registering.
    const openRef = useRef(false);
    openRef.current = selectedEditTaskId !== null;
    useEffect(
        () => registerDetailPane({ isOpen: () => openRef.current, close: closeEdit }),
        [closeEdit]
    );

    return {
        isWide,
        notesTaskId,
        subtasksTaskId,
        selectedEditTaskId,
        editIntent,
        toggleNotes,
        toggleSubtasks,
        selectEdit,
        closeEdit
    };
};
