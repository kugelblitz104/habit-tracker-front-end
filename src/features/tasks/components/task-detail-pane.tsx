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
        <aside className='sticky top-7 max-h-[calc(100vh-3.5rem)] w-[480px] shrink-0 overflow-y-auto'>
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
        </aside>
    );
};
