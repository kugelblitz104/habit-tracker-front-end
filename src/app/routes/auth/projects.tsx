import type { ProjectRead } from '@/api';
import { AppHeader } from '@/components/layouts/app-header';
import { Switch } from '@headlessui/react';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useCreateProject } from '@/features/projects/api/create-projects';
import { useProjects } from '@/features/projects/api/get-projects';
import { randomProjectColor } from '@/features/projects/utils/project-colors';
import { CaptureBar } from '@/features/tasks/components/capture-bar';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import type { Route } from './+types/projects';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Projects' }, { name: 'description', content: 'Your projects' }];
}

/** Grid card shared by the active and archived sections. */
const ProjectCard = ({ project }: { project: ProjectRead }) => {
    const openCount = project.open_count ?? 0;
    const doneCount = project.done_count ?? 0;
    return (
        <Link
            to={`/projects/${project.id}`}
            className={`flex items-center gap-3 rounded-card border p-4 transition-colors hover:bg-white/5 ${
                project.archived ? 'opacity-60' : ''
            }`}
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            <span
                className='inline-block h-3.5 w-3.5 shrink-0 rounded-sm'
                style={{ backgroundColor: project.color }}
            />
            <div className='min-w-0'>
                <div className='truncate font-display text-[15px] font-medium text-text-primary'>
                    {project.name}
                </div>
                <div className='mt-0.5 font-mono text-[11.5px] text-text-muted'>
                    {openCount} open · {doneCount} done
                </div>
            </div>
        </Link>
    );
};

function ProjectsContent() {
    const { activeProfileId } = useAuth();
    // Fetch archived too and split client-side, mirroring the habits dashboard's
    // "Archived" filter chip convention (hidden by default, revealed on toggle).
    const projectsQuery = useProjects({ profileId: activeProfileId, includeArchived: true });
    const createProject = useCreateProject();
    const [showArchived, setShowArchived] = useState(false);

    const allProjects = projectsQuery.data?.projects ?? [];
    const projects = allProjects.filter((p) => !p.archived);
    const archivedProjects = allProjects.filter((p) => p.archived);

    // Quick-capture create path: name only, with a sensible random palette color.
    // Color/notes are editable afterwards on the project view.
    const handleCaptureProject = async (name: string) => {
        if (!activeProfileId) return;
        try {
            await createProject.mutateAsync({
                profile_id: activeProfileId,
                name,
                color: randomProjectColor()
            });
            toast.success('Project created!');
        } catch (error) {
            toast.error('Failed to create project. Please try again.');
            // Re-throw so the capture bar keeps the typed text for a retry.
            throw error;
        }
    };

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                {archivedProjects.length > 0 && (
                    <div className='mb-5 flex items-center justify-end'>
                        <label className='flex cursor-pointer items-center gap-2'>
                            <span
                                className={`font-mono text-[10.5px] uppercase tracking-[0.12em] ${
                                    showArchived ? 'text-habit-label' : 'text-text-muted'
                                }`}
                            >
                                Archived ({archivedProjects.length})
                            </span>
                            <Switch
                                checked={showArchived}
                                onChange={setShowArchived}
                                aria-label='Show archived projects'
                                className='relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border outline-none transition-colors focus-visible:opacity-80'
                                style={{
                                    borderColor: showArchived
                                        ? 'var(--color-habit-accent)'
                                        : 'var(--habit-container-border)',
                                    backgroundColor: showArchived
                                        ? 'var(--color-habit-accent)'
                                        : 'transparent'
                                }}
                            >
                                <span
                                    aria-hidden='true'
                                    className='pointer-events-none inline-block h-3 w-3 rounded-full transition-transform'
                                    style={{
                                        backgroundColor: '#eef3f7',
                                        transform: showArchived
                                            ? 'translateX(16px)'
                                            : 'translateX(2px)'
                                    }}
                                />
                            </Switch>
                        </label>
                    </div>
                )}

                <CaptureBar
                    onCapture={handleCaptureProject}
                    disabled={!activeProfileId}
                    isPending={createProject.isPending}
                    placeholder='Add a project'
                />

                {projectsQuery.isError && (
                    <p className='font-mono text-[12px] text-danger'>Failed to load projects.</p>
                )}

                {projectsQuery.isLoading && (
                    <p className='font-mono text-[12px] text-text-faint'>Loading projects…</p>
                )}

                {!projectsQuery.isLoading && !projectsQuery.isError && allProjects.length === 0 && (
                    <p className='font-mono text-[12px] text-text-faint'>
                        No projects yet. Type a name above to create one.
                    </p>
                )}

                {projects.length > 0 && (
                    <div className='grid gap-2.5 sm:grid-cols-2'>
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}

                {showArchived && archivedProjects.length > 0 && (
                    <section className='mt-[30px]'>
                        <h2 className='mb-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                            Archived
                        </h2>
                        <div className='grid gap-2.5 sm:grid-cols-2'>
                            {archivedProjects.map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default function Projects() {
    return (
        <ProtectedRoute>
            <ProjectsContent />
        </ProtectedRoute>
    );
}
