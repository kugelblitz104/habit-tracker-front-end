import { useAuth } from '@/lib/auth-context';
import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { useCallback, useEffect, useState } from 'react';

/**
 * Master-detail state for the Habits dashboard, mirroring use-task-detail-pane.
 *
 * `isWide` (lg/xl, i.e. ≥1024px) decides how a selected habit renders: a sticky
 * right-side detail pane on wide screens. On narrow screens the dashboard lets
 * the row Link navigate to the full-page detail route instead, so this hook only
 * tracks which habit id is open.
 */
export const useHabitDetailPane = () => {
    const layout = useResponsiveLayout();
    const isWide = layout === 'lg' || layout === 'xl';
    const { activeProfileId } = useAuth();

    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);

    // Habits are profile-scoped: switching profiles closes any open habit pane
    // so a previous profile's habit doesn't linger.
    useEffect(() => {
        setSelectedHabitId(null);
    }, [activeProfileId]);

    // Tapping a habit name selects it for the pane; tapping the open one closes.
    const selectHabit = useCallback((habitId: number) => {
        setSelectedHabitId((current) => (current === habitId ? null : habitId));
    }, []);

    const closeHabit = useCallback(() => setSelectedHabitId(null), []);

    return {
        isWide,
        selectedHabitId,
        selectHabit,
        closeHabit
    };
};
