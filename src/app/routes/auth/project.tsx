import type { ProjectRead } from '@/api';
import { ErrorPage } from '@/components/layouts/error-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useDeleteProject } from '@/features/projects/api/delete-projects';
import { useProject } from '@/features/projects/api/get-projects';
import { useUpdateProject } from '@/features/projects/api/update-projects';
import { DeleteProjectModal } from '@/features/projects/components/delete-project-modal';
import { ProjectAnalytics } from '@/features/projects/components/project-analytics';
import { ProjectDangerZone } from '@/features/projects/components/project-danger-zone';
import { ProjectEditor } from '@/features/projects/components/project-editor';
import { ProjectHeader } from '@/features/projects/components/project-header';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import {
    TaskCaptureBar,
    type TaskCaptureDraft
} from '@/features/tasks/components/task-capture-bar';
import { TaskCaptureForm } from '@/features/tasks/components/task-capture-form';
import { CompletedSection } from '@/features/tasks/components/completed-section';
import { TaskControlsBar } from '@/features/tasks/components/task-controls-bar';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { TaskListView } from '@/features/tasks/components/task-list-view';
import { useTaskControls } from '@/features/tasks/hooks/use-task-controls';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import {
    buildTaskSections,
    passesDateFilter,
    showClosedSection
} from '@/features/tasks/utils/task-controls';
import { downloadMarkdownFile, renderTasksMarkdown, slugify } from '@/features/tasks/utils/task-markdown';
import { useCreateTimeEntry } from '@/features/time-entries/api/create-time-entries';
import { ProjectTimeLog } from '@/features/time-entries/components/project-time-log';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { AppHeader } from '@/components/layouts/app-header';
import { sanitizeText } from '@/lib/input-sanitization';
import { toLocalDateString } from '@/lib/date-utils';
import { PAGE_MAX_WIDTH, PAGE_MAX_WIDTH_PANE } from '@/lib/layout';
import { useAuth } from '@/lib/auth-context';
import { TimeEntryKind, type TaskStatus } from '@/types/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import type { Route } from './+types/project';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Project' }, { name: 'description', content: 'Project view' }];
}

function ProjectContent({ projectId }: { projectId: number }) {
    const { activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;
    const navigate = useNavigate();
    const location = useLocation();

    // Projects are profile-scoped: switching the active profile means this
    // project no longer belongs to the visible profile, so bounce back to the
    // all-projects list. Guard against the initial null -> id resolution on
    // first load (auth-context fills activeProfileId once profiles fetch) so a
    // fresh deep-link to /projects/:id isn't immediately redirected away.
    const prevProfileId = useRef(activeProfileId);
    useEffect(() => {
        const prev = prevProfileId.current;
        prevProfileId.current = activeProfileId;
        if (prev != null && activeProfileId != null && prev !== activeProfileId) {
            navigate('/projects');
        }
    }, [activeProfileId, navigate]);

    // Origin-aware back: return to wherever the project was opened from.
    const from = (location.state as { from?: string } | null)?.from;
    const backTo = from === '/' ? '/' : from === '/tasks' ? '/tasks' : '/projects';
    const backLabel = from === '/' ? '‹ Today' : from === '/tasks' ? '‹ All tasks' : '‹ Projects';

    const projectQuery = useProject({ projectId });
    // Include closed so the Status filter/group can reach done/cancelled tasks.
    const tasksQuery = useTasks({ profileId, projectId, includeClosed: true });
    const updateTask = useUpdateTask();
    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();
    const createTimeEntry = useCreateTimeEntry();

    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    // Quick-add draft carried into the expanded capture form (see Today).
    const [captureDraft, setCaptureDraft] = useState<TaskCaptureDraft | null>(null);
    const [controls, setControls] = useTaskControls(`project_tasks_controls`);

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

    const handleStartTimer = (taskId: number) => {
        if (!activeProfileId) return;
        createTimeEntry.mutate(
            { profile_id: activeProfileId, task_id: taskId, kind: TimeEntryKind.STOPWATCH },
            {
                onSuccess: () => toast.success('Timer started'),
                onError: (error) => toast.error(apiErrorMessage(error, 'Failed to start timer'))
            }
        );
    };

    const project = projectQuery.data;
    // Top-level tasks only (subtasks are managed within their parent).
    const tasks = useMemo(
        () => (tasksQuery.data?.tasks ?? []).filter((t) => t.parent_id == null),
        [tasksQuery.data]
    );
    const showPane = isWide && selectedEditTaskId !== null;

    // Every task here belongs to this one project, so a single-entry map is all
    // TaskCard needs to render its project tag.
    const projectsById = useMemo(() => {
        const map = new Map<number, ProjectRead>();
        if (project) map.set(project.id, project);
        return map;
    }, [project]);

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
            title: project?.name ?? 'Project',
            sections,
            closedTasks,
            allTasks: allLoadedTasks,
            projectsById
        });
        const projectSlug = slugify(project?.name ?? 'project');
        downloadMarkdownFile(`tasks-${projectSlug}-${toLocalDateString(new Date())}.md`, markdown);
    }, [tasks, controls, projectsById, showClosed, allLoadedTasks, project]);

    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        updateTask.mutate({ taskId, data: { status } });
    };

    const handleToggleArchive = () => {
        if (!project || updateProject.isPending) return;
        const nextArchived = !project.archived;
        updateProject.mutate(
            { projectId: project.id, data: { archived: nextArchived } },
            {
                onSuccess: () =>
                    toast.success(nextArchived ? 'Project archived' : 'Project unarchived'),
                onError: () => toast.error('Failed to update project. Please try again.')
            }
        );
    };

    const handleDelete = () => {
        if (!project || deleteProject.isPending) return;
        deleteProject.mutate(project.id, {
            onSuccess: () => {
                toast.success('Project deleted');
                navigate('/projects');
            },
            onError: () => toast.error('Failed to delete project. Please try again.')
        });
    };

    if (projectQuery.isError) {
        return <ErrorPage message='Project not found' />;
    }

    const openCount = project?.open_count ?? 0;
    const doneCount = project?.done_count ?? 0;
    const total = openCount + doneCount;
    const donePct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const notes = project?.notes?.trim();

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH} />
            <div
                className={`mx-auto px-5 py-7 md:px-7 ${
                    showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH
                }`}
            >
                <div className={isWide ? 'flex items-start gap-6' : undefined}>
                    <div className='min-w-0 flex-1'>
                        {/* Inline edit surface replaces the read view (mirrors the
                            habit detail pattern). */}
                        {isEditing && project ? (
                            <ProjectEditor
                                project={project}
                                isSaving={updateProject.isPending}
                                onDelete={() => setIsDeleteModalOpen(true)}
                                onCancel={() => setIsEditing(false)}
                                onSave={(update) =>
                                    updateProject.mutate(
                                        { projectId: project.id, data: update },
                                        {
                                            onSuccess: () => {
                                                setIsEditing(false);
                                                toast.success('Project updated');
                                            },
                                            onError: () =>
                                                toast.error(
                                                    'Failed to update project. Please try again.'
                                                )
                                        }
                                    )
                                }
                            />
                        ) : (
                            <>
                                <ProjectHeader
                                    backTo={backTo}
                                    backLabel={backLabel}
                                    project={project}
                                    openCount={openCount}
                                    doneCount={doneCount}
                                    donePct={donePct}
                                    onEdit={() => setIsEditing(true)}
                                />

                                {/* Project notes */}
                                {notes && (
                                    <div
                                        className='mb-[30px] rounded-card border p-4'
                                        style={{
                                            backgroundColor: 'var(--surface-card-bg)',
                                            borderColor: 'var(--surface-card-border)'
                                        }}
                                    >
                                        <h2 className='mb-2 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                                            Project notes
                                        </h2>
                                        <div className='font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-text-secondary-soft'>
                                            {sanitizeText(notes)}
                                        </div>
                                    </div>
                                )}

                                {/* Quick-add, pre-attached to this project (an @token
                                    still lets you retarget to another). */}
                                {activeProfileId &&
                                    (captureDraft !== null ? (
                                        <TaskCaptureForm
                                            profileId={activeProfileId}
                                            initial={captureDraft}
                                            onClose={() => setCaptureDraft(null)}
                                        />
                                    ) : (
                                        <TaskCaptureBar
                                            profileId={activeProfileId}
                                            defaultProjectId={projectId}
                                            onExpand={setCaptureDraft}
                                        />
                                    ))}

                                {tasksQuery.isError && (
                                    <p className='mb-6 font-mono text-[12px] text-danger'>
                                        Failed to load tasks.
                                    </p>
                                )}

                                <TaskControlsBar
                                    controls={controls}
                                    onChange={setControls}
                                    projects={[]}
                                    showProjectOptions={false}
                                    onExport={handleExport}
                                />

                                {tasksQuery.isLoading ? (
                                    <p className='font-mono text-[12px] text-text-faint'>
                                        Loading tasks…
                                    </p>
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
                                            emptyHint='No tasks in this project yet.'
                                            showProject={false}
                                        />

                                        {showClosed && (
                                            <CompletedSection
                                                profileId={activeProfileId}
                                                projectId={projectId}
                                                onSelectTask={selectEdit}
                                                selectedTaskId={selectedEditTaskId}
                                                controls={controls}
                                            />
                                        )}
                                    </>
                                )}

                                {project && !tasksQuery.isLoading && (
                                    <ProjectAnalytics project={project} tasks={allLoadedTasks} />
                                )}

                                <div className='mt-[30px]'>
                                    <ProjectTimeLog
                                        profileId={activeProfileId}
                                        projectId={projectId}
                                    />
                                </div>

                                {project && (
                                    <ProjectDangerZone
                                        project={project}
                                        isArchiving={updateProject.isPending}
                                        onToggleArchive={handleToggleArchive}
                                        onDeleteClick={() => setIsDeleteModalOpen(true)}
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

            {/* Mounted outside the edit/read swap so the confirm is reachable from
                both the footer Delete and the editor's in-form Delete. */}
            {project && (
                <DeleteProjectModal
                    isOpen={isDeleteModalOpen}
                    project={project}
                    onClose={() => setIsDeleteModalOpen(false)}
                    handleDeleteProject={handleDelete}
                />
            )}
        </div>
    );
}

export default function Project({
    params
}: Route.ComponentProps & { params: { projectId: string } }) {
    const projectId = parseInt(params.projectId, 10);

    if (isNaN(projectId)) {
        return <ErrorPage message='Invalid project ID' />;
    }

    return (
        <ProtectedRoute>
            <ProjectContent projectId={projectId} />
        </ProtectedRoute>
    );
}
