import { X } from 'lucide-react';
import { useState } from 'react';
import { HabitDetailBody } from './habit-detail-body';

type HabitDetailPaneProps = {
    /** The selected habit id, or null when nothing is open. */
    habitId: number | null;
    /** Wide layout (lg/xl) renders the sticky side pane; narrow renders nothing. */
    isWide: boolean;
    onClose: () => void;
};

/**
 * Master-detail host for the habit detail. On wide screens (lg/xl) it renders a
 * sticky right-side pane so the dashboard list stays visible. On narrow screens
 * it renders nothing — the row Link navigates to the full-page detail route.
 *
 * `HabitDetailBody` is keyed by habit id so selecting a different habit fully
 * re-seeds its queries and local tracker state.
 */
export const HabitDetailPane = ({ habitId, isWide, onClose }: HabitDetailPaneProps) => {
    // The body reports when it enters its inline edit surface; while editing we
    // drop the card chrome (border/bg) so the editor isn't framed as a box-in-box.
    const [editing, setEditing] = useState(false);

    if (habitId == null || !isWide) return null;

    return (
        // Fills (and clips) the grid pane track that animates 0 -> 480px while
        // opening; the fixed-width inner keeps the content laid out at its final
        // 480px throughout. `pane-rise` floats it up into place — it lives on the
        // scroll container itself (not the inner) so the transform doesn't inflate
        // scrollHeight and flash a scrollbar mid-rise. Keyed by habitId so picking
        // a different habit while the pane is open remounts it and replays the rise.
        <aside
            key={habitId}
            className='pane-rise sticky top-7 max-h-[calc(100vh-3.5rem)] w-full min-w-0 overflow-x-hidden overflow-y-auto'
        >
            <div className='w-[480px]'>
            <div
                className={editing ? 'relative p-4' : 'relative rounded-card border p-4'}
                style={
                    editing
                        ? undefined
                        : {
                              backgroundColor: 'var(--habit-container-bg)',
                              borderColor: 'var(--habit-container-border)'
                          }
                }
            >
                {/* The body renders the habit name at the very top, so the close
                    affordance floats in the card's top-right corner rather than
                    occupying its own header row. Hidden while editing — the editor
                    has its own Cancel/Save. */}
                {!editing && (
                    <button
                        type='button'
                        onClick={onClose}
                        aria-label='Close habit'
                        className='absolute right-4 top-4 z-10 rounded-button border p-1.5 text-text-secondary transition-colors hover:text-text-primary'
                        style={{ borderColor: 'var(--habit-container-border)' }}
                    >
                        <X size={14} />
                    </button>
                )}
                <HabitDetailBody
                    key={habitId}
                    habitId={habitId}
                    compact
                    onDeleted={onClose}
                    onEditingChange={setEditing}
                />
            </div>
            </div>
        </aside>
    );
};
