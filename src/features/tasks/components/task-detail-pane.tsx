import { useState } from 'react';
import { TaskDetailBody } from './task-detail-body';

type TaskDetailPaneProps = {
    /** The selected task id, or null when nothing is open. */
    taskId: number | null;
    /** Wide layout (lg/xl) is the only layout this pane renders in. */
    isWide: boolean;
    onClose: () => void;
    /** Open straight into the edit form (context menu "Edit…"). */
    defaultEditing?: boolean;
};

/**
 * Master-detail host for the task detail on WIDE screens (lg/xl): a sticky
 * right-side pane so the list stays fully visible. Narrow screens navigate to
 * the full-page `/tasks/:taskId` screen instead. The card chrome drops while
 * editing so the editor isn't boxed-in-a-box; the header (title / "Edit task",
 * edit + close controls) is owned by `TaskDetailBody` so the pane and the
 * full-page route stay visually consistent.
 *
 * Keyed by `taskId` + edit intent so selecting a different task — or the
 * context menu's "Edit…" on the already-open task — fully re-seeds it.
 */
export const TaskDetailPane = ({
    taskId,
    onClose,
    defaultEditing = false
}: TaskDetailPaneProps) => {
    const [editing, setEditing] = useState(defaultEditing);
    if (taskId == null) return null;

    return (
        // Fills (and clips) the grid pane track that animates 0 -> 480px while
        // opening; the fixed-width inner keeps the content laid out at its final
        // 480px throughout. `pane-rise` floats it up into place — it lives on the
        // scroll container itself (not the inner) so the transform doesn't inflate
        // scrollHeight and flash a scrollbar mid-rise. Keyed by taskId so picking
        // a different task while the pane is open remounts it and replays the rise.
        <aside
            key={taskId}
            className='pane-rise sticky top-7 max-h-[calc(100vh-3.5rem)] w-full min-w-0 overflow-x-hidden overflow-y-auto'
        >
            <div className='w-[480px]'>
                <div
                    className={editing ? 'p-4' : 'rounded-card border p-4'}
                    style={
                        editing
                            ? undefined
                            : {
                                  backgroundColor: 'var(--surface-card-bg)',
                                  borderColor: 'var(--surface-card-border)'
                              }
                    }
                >
                    <TaskDetailBody
                        key={`${taskId}-${defaultEditing ? 'edit' : 'view'}`}
                        taskId={taskId}
                        onClose={onClose}
                        defaultEditing={defaultEditing}
                        onEditingChange={setEditing}
                    />
                </div>
            </div>
        </aside>
    );
};
