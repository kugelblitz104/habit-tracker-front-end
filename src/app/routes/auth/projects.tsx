import type { ProjectRead } from '@/api';
import { AppHeader } from '@/components/layouts/app-header';
import { ToggleButton } from '@/components/ui/buttons/toggle-button';
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

    const subline =
        `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}` +
        (archivedProjects.length > 0 ? ` · ${archivedProjects.length} archived` : '');

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
        <div className='min-h-screen' style={{ backgroundColor: 'var(--bg)' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <header className='mb-[30px] flex items-start justify-between gap-4'>
                    <div>
                        <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                            Projects
                        </h1>
                        <p className='mt-0.5 font-mono text-[12px] text-text-muted'>{subline}</p>
                    </div>
                    {archivedProjects.length > 0 && (
                        <ToggleButton
                            isActive={showArchived}
                            onClick={() => setShowArchived((prev) => !prev)}
                        >
                            Archived
                        </ToggleButton>
                    )}
                </header>

                <CaptureBar
                    onCapture={handleCaptureProject}
                    disabled={!activeProfileId}
                    isPending={createProject.isPending}
                    placeholder='Add a project — type a name and press enter'
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
