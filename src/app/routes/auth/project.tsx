import type { ProjectRead } from '@/api';
import { ErrorPage } from '@/components/layouts/error-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useProject } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { BandSection } from '@/features/tasks/components/band-section';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import { countGroupedTasks, groupTasksByBand } from '@/features/tasks/utils/task-bands';
import { AppHeader } from '@/components/layouts/app-header';
import { sanitizeText } from '@/lib/input-sanitization';
import { PAGE_MAX_WIDTH, PAGE_MAX_WIDTH_PANE } from '@/lib/layout';
import { useAuth } from '@/lib/auth-context';
import { type TaskStatus } from '@/types/types';
import { useMemo } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/project';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Project' }, { name: 'description', content: 'Project view' }];
}

function ProjectContent({ projectId }: { projectId: number }) {
    const { activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    const projectQuery = useProject({ projectId });
    const tasksQuery = useTasks({ profileId, projectId });
    const updateTask = useUpdateTask();

    const { isWide, notesTaskId, selectedEditTaskId, toggleNotes, selectEdit, closeEdit } =
        useTaskDetailPane();

    const project = projectQuery.data;
    const tasks = tasksQuery.data?.tasks ?? [];
    const selectedTask = tasks.find((task) => task.id === selectedEditTaskId) ?? null;
    const showPane = isWide && selectedTask !== null;

    // Every task here belongs to this one project, so a single-entry map is all
    // TaskCard needs to render its project tag.
    const projectsById = useMemo(() => {
        const map = new Map<number, ProjectRead>();
        if (project) map.set(project.id, project);
        return map;
    }, [project]);

    const grouped = useMemo(() => groupTasksByBand(tasks), [tasks]);

    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        updateTask.mutate({ taskId, data: { status } });
    };

    if (projectQuery.isError) {
        return <ErrorPage message='Project not found' />;
    }

    const openCount = project?.open_count ?? 0;
    const doneCount = project?.done_count ?? 0;
    const total = openCount + doneCount;
    const donePct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const notes = project?.notes?.trim();
    // Base "has tasks" on the set actually rendered (known bands only), so a task
    // with an unknown/hidden band can't suppress the empty-state while showing
    // nowhere.
    const hasTasks = countGroupedTasks(grouped) > 0;

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'var(--bg)' }}>
            <AppHeader maxWidthClass={showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH} />
            <div
                className={`mx-auto px-5 py-7 md:px-7 ${
                    showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH
                }`}
            >
                <div className={isWide ? 'flex items-start gap-6' : undefined}>
                    <div className='min-w-0 flex-1'>
                        {/* Header */}
                        <header className='mb-[30px]'>
                            <Link
                                to='/'
                                className='font-mono text-[12px] text-text-muted hover:text-text-secondary'
                            >
                                ‹ All tasks
                            </Link>

                            <div className='mt-3 flex items-center gap-2.5'>
                                {project && (
                                    <span
                                        className='inline-block h-3.5 w-3.5 shrink-0 rounded-sm'
                                        style={{ backgroundColor: project.color }}
                                    />
                                )}
                                <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                                    {project?.name ?? 'Project'}
                                </h1>
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
                                        backgroundColor: project?.color ?? 'var(--color-now-accent)'
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

                        {tasksQuery.isError && (
                            <p className='mb-6 font-mono text-[12px] text-danger'>
                                Failed to load tasks.
                            </p>
                        )}

                        {grouped.map(({ band, tasks: bandTasks }) => (
                            <BandSection
                                key={band}
                                band={band}
                                tasks={bandTasks}
                                projectsById={projectsById}
                                onStatusChange={handleStatusChange}
                                notesTaskId={notesTaskId}
                                selectedEditTaskId={selectedEditTaskId}
                                onToggleNotes={toggleNotes}
                                onSelectEdit={selectEdit}
                                headerAccessory={
                                    band === 'now' ? (
                                        <Link
                                            to='/'
                                            className='font-mono text-[11px] text-text-faint hover:text-text-muted'
                                        >
                                            also on Today ↗
                                        </Link>
                                    ) : undefined
                                }
                            />
                        ))}

                        {!hasTasks && !tasksQuery.isLoading && !tasksQuery.isError && (
                            <p className='font-mono text-[12px] text-text-faint'>
                                No tasks in this project yet.
                            </p>
                        )}
                    </div>

                    <TaskDetailPane task={selectedTask} isWide={isWide} onClose={closeEdit} />
                </div>
            </div>
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
