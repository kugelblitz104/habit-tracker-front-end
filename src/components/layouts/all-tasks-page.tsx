import type { ProjectRead } from '@/api';
import { AppHeader } from '@/components/layouts/app-header';
import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
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
import { useTaskSelection } from '@/features/tasks/hooks/use-task-selection';
import {
    buildTaskSections,
    passesDateFilter,
    showClosedSection
} from '@/features/tasks/utils/task-controls';
import { downloadMarkdownFile, renderTasksMarkdown, slugify } from '@/features/tasks/utils/task-markdown';
import { useCreateTimeEntry } from '@/features/time-entries/api/create-time-entries';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { useAuth } from '@/lib/auth-context';
import { toLocalDateString } from '@/lib/date-utils';
import { useScrollRestoration } from '@/lib/use-scroll-restoration';
import { PAGE_MAX_WIDTH, PAGE_MAX_WIDTH_PANE, PAGE_WIDTH_TRANSITION, paneRowClass } from '@/lib/layout';
import { toastTaskClosed } from '@/features/tasks/utils/task-status-toast';
import { TaskStatus, TimeEntryKind } from '@/types/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { toast } from 'react-toastify';

/**
 * Dedicated "All tasks" surface: the active profile's tasks (top-level only,
 * including closed) with sort / group / filter controls — the flat counterpart
 * to Today's band grouping. Reuses the same capture bar, TaskCard rows and
 * detail pane as the other task surfaces.
 */
export const AllTasksDashboard = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    // Everything (incl. done/cancelled) so the Status filter/group can reach
    // closed tasks; subtasks are managed within their parent and excluded here.
    const tasksQuery = useTasks({ profileId, includeClosed: true });
    const projectsQuery = useProjects({ profileId, includeArchived: true });
    const updateTask = useUpdateTask();
    const createTimeEntry = useCreateTimeEntry();

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
    // to the full-page /tasks/:id route). Keyed on location.key so repeat
    // searches re-trigger even when already on this page.
    const location = useLocation();
    useEffect(() => {
        const openTaskId = (location.state as { openTaskId?: number } | null)?.openTaskId;
        if (openTaskId != null) selectEdit(openTaskId);
        // selectEdit is stable for a given viewport; re-run only on navigation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key]);

    const showPane = isWide && selectedEditTaskId !== null;

    // Land back where you left off when returning to this view (restores once
    // the task list has loaded so the saved offset isn't clamped short).
    useScrollRestoration('all_tasks_scroll', !tasksQuery.isLoading);

    const tasks = useMemo(
        () => (tasksQuery.data?.tasks ?? []).filter((t) => t.parent_id == null),
        [tasksQuery.data]
    );

    const projects = projectsQuery.data?.projects ?? [];
    const projectsById = useMemo(() => {
        const map = new Map<number, ProjectRead>();
        for (const project of projects) map.set(project.id, project);
        return map;
    }, [projects]);

    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        const previous = tasks.find((t) => t.id === taskId)?.status;
        updateTask.mutate(
            { taskId, data: { status } },
            {
                onSuccess: () => {
                    if (status === TaskStatus.DONE || status === TaskStatus.CANCELLED) {
                        toastTaskClosed(
                            status === TaskStatus.DONE ? 'done' : 'cancelled',
                            previous != null && previous !== status
                                ? () => updateTask.mutate({ taskId, data: { status: previous } })
                                : undefined
                        );
                    }
                },
                onError: (error) =>
                    toast.error(apiErrorMessage(error, 'Failed to update task status'))
            }
        );
    };

    const handleStartTimer = useCallback(
        (taskId: number) => {
            if (!activeProfileId) return;
            createTimeEntry.mutate(
                { profile_id: activeProfileId, task_id: taskId, kind: TimeEntryKind.STOPWATCH },
                {
                    onSuccess: () => toast.success('Timer started'),
                    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to start timer'))
                }
            );
        },
        [activeProfileId, createTimeEntry]
    );

    // Done/cancelled tasks are excluded from the main grouped list by default
    // (they live in the Closed section below); the section itself only shows
    // once the user checks Done and/or Cancelled in the Status filter.
    const showClosed = showClosedSection(controls);
    const allLoadedTasks = tasksQuery.data?.tasks ?? [];

    const handleExport = useCallback(() => {
        const sections = buildTaskSections(tasks, controls, projectsById);
        const closedTasks = showClosed
            ? allLoadedTasks.filter(
                  (t) =>
                      t.parent_id == null &&
                      t.band === 'hidden' &&
                      passesDateFilter(t, controls)
              )
            : [];
        const markdown = renderTasksMarkdown({
            title: 'All tasks',
            sections,
            closedTasks,
            allTasks: allLoadedTasks,
            projectsById
        });
        const profileSlug = slugify(activeProfile?.name ?? 'tasks');
        downloadMarkdownFile(`tasks-${profileSlug}-${toLocalDateString(new Date())}.md`, markdown);
    }, [tasks, controls, projectsById, showClosed, allLoadedTasks, activeProfile]);

    // Ids currently visible under the active filters — the target of "Select all".
    const visibleIds = useMemo(
        () =>
            buildTaskSections(tasks, controls, projectsById).flatMap((s) =>
                s.tasks.map((t) => t.id)
            ),
        [tasks, controls, projectsById]
    );
    const selectedIdArray = [...selection.selectedIds];

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH} />
            <div
                className={`mx-auto px-5 py-7 md:px-7 ${PAGE_WIDTH_TRANSITION} ${
                    showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH
                }`}
            >
                <div className={paneRowClass(isWide, showPane)}>
                    <div className='min-w-0 flex-1'>
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

                        {tasksQuery.isError ? (
                            <p className='font-mono text-[12px] text-danger'>
                                Failed to load tasks.
                            </p>
                        ) : tasksQuery.isLoading ? (
                            <p className='font-mono text-[12px] text-text-faint'>Loading tasks…</p>
                        ) : (
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
                    </div>

                    <TaskDetailPane
                        taskId={selectedEditTaskId}
                        isWide={isWide}
                        onClose={closeEdit}
                        defaultEditing={editIntent}
                    />
                </div>
            </div>

            {selection.selectionMode && (
                <BulkActionBar
                    count={selection.selectedIds.size}
                    projects={projects}
                    onSetStatus={(status) => bulk.updateMany(selectedIdArray, { status })}
                    onSetPriority={(priority) => bulk.updateMany(selectedIdArray, { priority })}
                    onSetProject={(project_id) => bulk.updateMany(selectedIdArray, { project_id })}
                    onDelete={() => bulk.deleteMany(selectedIdArray)?.then(() => selection.exit())}
                    onSelectAll={() => selection.selectMany(visibleIds)}
                    onClose={selection.exit}
                    isPending={bulk.isPending}
                />
            )}
        </div>
    );
};
