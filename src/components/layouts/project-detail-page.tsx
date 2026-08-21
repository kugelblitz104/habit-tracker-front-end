import type { ProjectRead } from '@/api';
import { ErrorPage } from '@/components/layouts/error-page';
import { LoadingPage } from '@/components/layouts/loading-page';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { QueryState } from '@/components/ui/query-state';
import { useDeleteProject } from '@/features/projects/api/delete-projects';
import {
    getProjectQueryOptions,
    useProject,
    useProjectBySlug,
    useProjects
} from '@/features/projects/api/get-projects';
import { useUpdateProject } from '@/features/projects/api/update-projects';
import { DeleteProjectModal } from '@/features/projects/components/delete-project-modal';
import { ProjectAnalytics } from '@/features/projects/components/project-analytics';
import { ProjectDangerZone } from '@/features/projects/components/project-danger-zone';
import { ProjectEditor } from '@/features/projects/components/project-editor';
import { ProjectHeader } from '@/features/projects/components/project-header';
import { useTasks } from '@/features/tasks/api/get-tasks';
import {
    TaskCaptureBar,
    type TaskCaptureDraft
} from '@/features/tasks/components/task-capture-bar';
import { TaskCaptureForm } from '@/features/tasks/components/task-capture-form';
import { BulkActionBar } from '@/features/tasks/components/bulk-action-bar';
import { CompletedSection } from '@/features/tasks/components/completed-section';
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
import { ProjectTimeLog } from '@/features/time-entries/components/project-time-log';
import { PageShell } from '@/components/layouts/page-shell';
import { sanitizeText } from '@/lib/input-sanitization';
import { useAuth } from '@/lib/auth-context';
import { parseEntityRef } from '@/lib/entity-ref';
import { useSlugResolution } from '@/lib/use-slug-resolution';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';

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
    const backLabel = from === '/' ? 'Today' : from === '/tasks' ? 'All tasks' : 'Projects';

    const projectQuery = useProject({ projectId });
    // Include closed so the Status filter/group can reach done/cancelled tasks.
    const tasksQuery = useTasks({ profileId, projectId, includeClosed: true });
    // All projects (archived-aware) for the bulk "move to project" action.
    const allProjectsQuery = useProjects({ profileId, includeArchived: true });
    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();
    const handleStartTimer = useStartTaskTimer(activeProfileId);

    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    // Quick-add draft carried into the expanded capture form (see Today).
    const [captureDraft, setCaptureDraft] = useState<TaskCaptureDraft | null>(null);
    const [controls, setControls] = useTaskControls(`project_tasks_controls`);
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

    const project = projectQuery.data;
    // Top-level tasks only (subtasks are managed within their parent).
    const tasks = useMemo(
        () => (tasksQuery.data?.tasks ?? []).filter((t) => t.parent_id == null),
        [tasksQuery.data]
    );
    const showPane = isWide && selectedEditTaskId !== null;

    // Every task here belongs to this one project, so a single-entry map is all
    // TaskRow needs to render its project tag. Deliberately NOT the shared
    // `useProjectsById` (Today/All tasks): that hook takes a list, and wrapping
    // this single `project` as `[project]` would allocate a new array every
    // render, defeating its memo.
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

    const { handleExport, visibleIds } = useTaskMarkdownExport({
        tasks,
        allLoadedTasks,
        controls,
        projectsById,
        title: project?.name ?? 'Project',
        filenameSource: project?.name,
        filenameFallback: 'project'
    });
    const selectedIdArray = [...selection.selectedIds];
    const allProjects = allProjectsQuery.data?.projects ?? [];

    // Adopting the shared hook adds an onError toast here (the project view had
    // none before) — see `e2e/flows/task-status.spec.ts`.
    const handleStatusChange = useTaskStatusChange(tasks);

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
                <>
                    {selection.selectionMode && (
                        <BulkActionBar
                            count={selection.selectedIds.size}
                            projects={allProjects}
                            onSetStatus={(status) => bulk.updateMany(selectedIdArray, { status })}
                            onSetPriority={(priority) =>
                                bulk.updateMany(selectedIdArray, { priority })
                            }
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
                    )}

                    {/* Mounted outside the edit/read swap so the confirm is
                        reachable from both the footer Delete and the editor's
                        in-form Delete. */}
                    {project && (
                        <DeleteProjectModal
                            isOpen={isDeleteModalOpen}
                            project={project}
                            onClose={() => setIsDeleteModalOpen(false)}
                            handleDeleteProject={handleDelete}
                        />
                    )}
                </>
            }
        >
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
                                    toast.error('Failed to update project. Please try again.')
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
                            style={CARD_SURFACE_STYLE}
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

                    <QueryState
                        isError={tasksQuery.isError}
                        errorMessage='Failed to load tasks.'
                        size='md'
                        className='mb-6'
                    />

                    <TaskControlsBar
                        controls={controls}
                        onChange={setControls}
                        projects={[]}
                        showProjectOptions={false}
                        onExport={handleExport}
                        onToggleSelection={selection.toggleMode}
                        selectionActive={selection.selectionMode}
                    />

                    <QueryState
                        isLoading={tasksQuery.isLoading}
                        loadingMessage='Loading tasks…'
                        size='md'
                    />

                    {!tasksQuery.isLoading && (
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
                                selectionMode={selection.selectionMode}
                                selectedIds={selection.selectedIds}
                                onToggleSelect={selection.toggle}
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
                        <ProjectTimeLog profileId={activeProfileId} projectId={projectId} />
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
        </PageShell>
    );
}

/**
 * Page chrome for the states that render before `ProjectContent` exists: a slug
 * still resolving, or one that matched nothing.
 *
 * `ProjectContent` brings its own `PageShell`, so without this the app header
 * and nav would vanish on a bad project link, leaving a bare error with no way
 * out. The task and habit detail routes wrap their equivalent states the same
 * way.
 */
function ProjectStateShell({ children }: { children: React.ReactNode }) {
    return (
        <PageShell isWide={false} showPane={false}>
            {children}
        </PageShell>
    );
}

/**
 * Slug URLs (`/projects/alpha-project`) resolve the slug to a project, then hand
 * the resolved id to the same content the numeric route renders. Resolution is
 * scoped to the active profile, since slugs are unique per profile.
 */
function ProjectBySlug({ slug }: { slug: string }) {
    const { activeProfileId } = useAuth();
    const query = useProjectBySlug({ slug, profileId: activeProfileId });
    const { id, isPending, notFound } = useSlugResolution(
        query,
        (project) => getProjectQueryOptions(project.id).queryKey
    );

    if (isPending) {
        return (
            <ProjectStateShell>
                <LoadingPage />
            </ProjectStateShell>
        );
    }
    if (notFound || id === null) {
        return (
            <ProjectStateShell>
                <ErrorPage message="That project link doesn't match a project in this profile." />
            </ProjectStateShell>
        );
    }
    return <ProjectContent projectId={id} />;
}

export const ProjectDetailPage = ({ projectRef }: { projectRef: string }) => {
    const ref = parseEntityRef(projectRef);

    if (ref === null) {
        return (
            <ProjectStateShell>
                <ErrorPage message='Invalid project URL' />
            </ProjectStateShell>
        );
    }

    return 'id' in ref ? <ProjectContent projectId={ref.id} /> : <ProjectBySlug slug={ref.slug} />;
};
