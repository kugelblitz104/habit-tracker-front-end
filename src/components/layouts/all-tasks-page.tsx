import { PageShell } from '@/components/layouts/page-shell';
import { QueryState } from '@/components/ui/query-state';
import { useProjects } from '@/features/projects/api/get-projects';
import { useProjectsById } from '@/features/projects/hooks/use-projects-by-id';
import { useTasks } from '@/features/tasks/api/get-tasks';
import {
    TaskCaptureBar,
    type TaskCaptureDraft
} from '@/features/tasks/components/task-capture-bar';
import { TaskCaptureForm } from '@/features/tasks/components/task-capture-form';
import { CompletedSection } from '@/features/tasks/components/completed-section';
import { BulkActionBar } from '@/features/tasks/components/bulk-action-bar';
import { TaskControlsBar } from '@/features/tasks/components/task-controls-bar';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { TaskListView } from '@/features/tasks/components/task-list-view';
import { useBulkTaskActions } from '@/features/tasks/hooks/use-bulk-task-actions';
import { useTaskControls } from '@/features/tasks/hooks/use-task-controls';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import { useTaskMarkdownExport } from '@/features/tasks/hooks/use-task-markdown-export';
import { useTaskSelection } from '@/features/tasks/hooks/use-task-selection';
import { useTaskStatusChange } from '@/features/tasks/hooks/use-task-status-change';
import { showClosedSection } from '@/features/tasks/utils/task-controls';
import { useStartTaskTimer } from '@/features/time-entries/hooks/use-start-task-timer';
import { useAuth } from '@/lib/auth-context';
import { useOpenFromSearchState } from '@/lib/use-open-from-search-state';
import { useScrollRestoration } from '@/lib/use-scroll-restoration';
import { useMemo, useState } from 'react';

/**
 * Dedicated "All tasks" surface: the active profile's tasks (top-level only,
 * including closed) with sort / group / filter controls — the flat counterpart
 * to Today's band grouping. Reuses the same capture bar, TaskRow rows and
 * detail pane as the other task surfaces.
 */
export const AllTasksDashboard = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    // Everything (incl. done/cancelled) so the Status filter/group can reach
    // closed tasks; subtasks are managed within their parent and excluded here.
    const tasksQuery = useTasks({ profileId, includeClosed: true });
    const projectsQuery = useProjects({ profileId, includeArchived: true });
    const handleStartTimer = useStartTaskTimer(activeProfileId);

    const [controls, setControls] = useTaskControls('all_tasks_controls');
    const [captureDraft, setCaptureDraft] = useState<TaskCaptureDraft | null>(null);
    const selection = useTaskSelection();
    const bulk = useBulkTaskActions();

    const {
        isWide,
        notesTaskId,
        subtasksTaskId,
        selectedEditTaskId,
        editIntent,
        toggleNotes,
        toggleSubtasks,
        selectEdit,
        closeEdit
    } = useTaskDetailPane();

    // Open a task's detail pane when arriving from global search (on wide
    // screens it routes here with the id in router state; narrow goes straight
    // to the full-page /tasks/:id route).
    useOpenFromSearchState('openTaskId', selectEdit);

    const showPane = isWide && selectedEditTaskId !== null;

    // Land back where you left off when returning to this view (restores once
    // the task list has loaded so the saved offset isn't clamped short).
    useScrollRestoration('all_tasks_scroll', !tasksQuery.isLoading);

    const tasks = useMemo(
        () => (tasksQuery.data?.tasks ?? []).filter((t) => t.parent_id == null),
        [tasksQuery.data]
    );

    const projects = projectsQuery.data?.projects ?? [];
    const projectsById = useProjectsById(projectsQuery.data?.projects);

    const handleStatusChange = useTaskStatusChange(tasks);

    // Done/cancelled tasks are excluded from the main grouped list by default
    // (they live in the Closed section below); the section itself only shows
    // once the user checks Done and/or Cancelled in the Status filter.
    const showClosed = showClosedSection(controls);
    const allLoadedTasks = tasksQuery.data?.tasks ?? [];

    const { handleExport, visibleIds } = useTaskMarkdownExport({
        tasks,
        allLoadedTasks,
        controls,
        projectsById,
        title: 'All tasks',
        filenameSource: activeProfile?.name,
        filenameFallback: 'tasks'
    });
    const selectedIdArray = [...selection.selectedIds];

    return (
        <PageShell
            isWide={isWide}
            showPane={showPane}
            pane={
                <TaskDetailPane
                    taskId={selectedEditTaskId}
                    onClose={closeEdit}
                    defaultEditing={editIntent}
                />
            }
            overlay={
                selection.selectionMode && (
                    <BulkActionBar
                        count={selection.selectedIds.size}
                        projects={projects}
                        onSetStatus={(status) => bulk.updateMany(selectedIdArray, { status })}
                        onSetPriority={(priority) => bulk.updateMany(selectedIdArray, { priority })}
                        onSetProject={(project_id) =>
                            bulk.updateMany(selectedIdArray, { project_id })
                        }
                        onDelete={() =>
                            bulk.deleteMany(selectedIdArray)?.then(() => selection.exit())
                        }
                        onSelectAll={() => selection.selectMany(visibleIds)}
                        onClose={selection.exit}
                        isPending={bulk.isPending}
                    />
                )
            }
        >
            <header className='mb-[30px]'>
                <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                    All tasks
                </h1>
                <p className='mt-1.5 font-mono text-[12px] text-text-muted'>
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </p>
            </header>

            {captureDraft !== null && activeProfileId ? (
                <TaskCaptureForm
                    profileId={activeProfileId}
                    initial={captureDraft}
                    onClose={() => setCaptureDraft(null)}
                />
            ) : (
                <TaskCaptureBar
                    profileId={activeProfileId}
                    onExpand={setCaptureDraft}
                    disabled={!activeProfileId}
                />
            )}

            <TaskControlsBar
                controls={controls}
                onChange={setControls}
                projects={projects}
                onExport={handleExport}
                onToggleSelection={selection.toggleMode}
                selectionActive={selection.selectionMode}
            />

            <QueryState
                isError={tasksQuery.isError}
                isLoading={tasksQuery.isLoading}
                errorMessage='Failed to load tasks.'
                loadingMessage='Loading tasks…'
                size='md'
            />

            {!tasksQuery.isError && !tasksQuery.isLoading && (
                <>
                    <TaskListView
                        tasks={tasks}
                        projectsById={projectsById}
                        controls={controls}
                        onStatusChange={handleStatusChange}
                        notesTaskId={notesTaskId}
                        selectedEditTaskId={selectedEditTaskId}
                        onToggleNotes={toggleNotes}
                        onSelectEdit={selectEdit}
                        subtasksTaskId={subtasksTaskId}
                        onToggleSubtasks={toggleSubtasks}
                        onStartTimer={handleStartTimer}
                        emptyHint='No tasks yet. Add one above.'
                        noMatchesHint='No tasks match these filters. Try Reset or loosen a filter.'
                        selectionMode={selection.selectionMode}
                        selectedIds={selection.selectedIds}
                        onToggleSelect={selection.toggle}
                    />

                    {showClosed && (
                        <CompletedSection
                            profileId={activeProfileId}
                            onSelectTask={selectEdit}
                            selectedTaskId={selectedEditTaskId}
                            controls={controls}
                        />
                    )}
                </>
            )}
        </PageShell>
    );
};
