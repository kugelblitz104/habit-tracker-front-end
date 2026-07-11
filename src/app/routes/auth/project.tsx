import type { ProjectRead } from '@/api';
import { ErrorPage } from '@/components/layouts/error-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useDeleteProject } from '@/features/projects/api/delete-projects';
import { useProject } from '@/features/projects/api/get-projects';
import { useUpdateProject } from '@/features/projects/api/update-projects';
import { DeleteProjectModal } from '@/features/projects/components/delete-project-modal';
import { ProjectEditor } from '@/features/projects/components/project-editor';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import {
    TaskCaptureBar,
    type TaskCaptureDraft
} from '@/features/tasks/components/task-capture-bar';
import { TaskCaptureForm } from '@/features/tasks/components/task-capture-form';
import { TaskControlsBar } from '@/features/tasks/components/task-controls-bar';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { TaskListView } from '@/features/tasks/components/task-list-view';
import { useTaskControls } from '@/features/tasks/hooks/use-task-controls';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import { useCreateTimeEntry } from '@/features/time-entries/api/create-time-entries';
import { ProjectTimeLog } from '@/features/time-entries/components/project-time-log';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { AppHeader } from '@/components/layouts/app-header';
import { sanitizeText } from '@/lib/input-sanitization';
import { PAGE_MAX_WIDTH, PAGE_MAX_WIDTH_PANE } from '@/lib/layout';
import { useAuth } from '@/lib/auth-context';
import { TimeEntryKind, type TaskStatus } from '@/types/types';
import { Archive, ArchiveRestore, Pencil, Trash } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
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
                                {/* Header */}
                                <header className='mb-[30px]'>
                                    <Link
                                        to={backTo}
                                        className='font-mono text-[12px] text-text-muted hover:text-text-secondary'
                                    >
                                        {backLabel}
                                    </Link>

                                    <div className='mt-3 flex items-start justify-between gap-4'>
                                        <div className='flex min-w-0 items-center gap-2.5'>
                                            {project && (
                                                <span
                                                    className='inline-block h-3.5 w-3.5 shrink-0 rounded-sm'
                                                    style={{ backgroundColor: project.color }}
                                                />
                                            )}
                                            <h1 className='truncate font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                                                {project?.name ?? 'Project'}
                                            </h1>
                                            {project?.archived && (
                                                <span
                                                    className='shrink-0 rounded-chip border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted'
                                                    style={{
                                                        borderColor: 'var(--surface-card-border)'
                                                    }}
                                                >
                                                    Archived
                                                </span>
                                            )}
                                        </div>
                                        {project && (
                                            <button
                                                type='button'
                                                onClick={() => setIsEditing(true)}
                                                aria-label='Edit project'
                                                title='Edit project'
                                                className='shrink-0 rounded-button border p-1.5 text-text-secondary transition-colors hover:text-text-primary'
                                                style={{
                                                    borderColor: 'var(--habit-container-border)'
                                                }}
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <p className='mt-1.5 font-mono text-[12px] text-text-muted'>
                                        {openCount} open · {doneCount} done
                                    </p>
                                    <div
                                        className='mt-2 h-1.5 w-full max-w-[280px] overflow-hidden rounded-chip'
                                        style={{ backgroundColor: 'var(--surface-input-bg)' }}
                                    >
                                        <div
                                            className='h-full rounded-chip transition-all'
                                            style={{
                                                width: `${donePct}%`,
                                                backgroundColor:
                                                    project?.color ?? 'var(--color-now-accent)'
                                            }}
                                        />
                                    </div>
                                </header>

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
                                />

                                {tasksQuery.isLoading ? (
                                    <p className='font-mono text-[12px] text-text-faint'>
                                        Loading tasks…
                                    </p>
                                ) : (
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
                                    />
                                )}

                                <div className='mt-[30px]'>
                                    <ProjectTimeLog
                                        profileId={activeProfileId}
                                        projectId={projectId}
                                    />
                                </div>

                                {/* Footer: Archive / Delete danger zone, separated from the
                            content by a hairline (mirrors the habit detail footer). */}
                                {project && (
                                    <div
                                        className='mt-[30px] flex items-center justify-end gap-1.5 border-t pt-4'
                                        style={{ borderColor: 'var(--surface-card-border)' }}
                                    >
                                        <button
                                            type='button'
                                            onClick={handleToggleArchive}
                                            disabled={updateProject.isPending}
                                            className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50'
                                            style={{ borderColor: 'var(--habit-container-border)' }}
                                        >
                                            {project.archived ? (
                                                <ArchiveRestore size={13} />
                                            ) : (
                                                <Archive size={13} />
                                            )}
                                            {project.archived ? 'Unarchive' : 'Archive'}
                                        </button>
                                        <button
                                            type='button'
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125'
                                            style={{
                                                borderColor: 'var(--habit-container-border)',
                                                color: 'var(--color-danger)'
                                            }}
                                        >
                                            <Trash size={13} />
                                            Delete
                                        </button>
                                    </div>
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
