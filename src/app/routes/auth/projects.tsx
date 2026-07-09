import { AppHeader } from '@/components/layouts/app-header';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useProjects } from '@/features/projects/api/get-projects';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { Link } from 'react-router';
import type { Route } from './+types/projects';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Projects' }, { name: 'description', content: 'Your projects' }];
}

function ProjectsContent() {
    const { activeProfileId } = useAuth();
    const projectsQuery = useProjects({ profileId: activeProfileId });

    const projects = projectsQuery.data?.projects ?? [];
    const subline = `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`;

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'var(--bg)' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <header className='mb-[30px]'>
                    <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                        Projects
                    </h1>
                    <p className='mt-0.5 font-mono text-[12px] text-text-muted'>{subline}</p>
                </header>

                {projectsQuery.isError && (
                    <p className='font-mono text-[12px] text-danger'>Failed to load projects.</p>
                )}

                {projectsQuery.isLoading && (
                    <p className='font-mono text-[12px] text-text-faint'>Loading projects…</p>
                )}

                {!projectsQuery.isLoading &&
                    !projectsQuery.isError &&
                    projects.length === 0 && (
                        <p className='font-mono text-[12px] text-text-faint'>
                            No projects yet.
                        </p>
                    )}

                {projects.length > 0 && (
                    <div className='grid gap-2.5 sm:grid-cols-2'>
                        {projects.map((project) => {
                            const openCount = project.open_count ?? 0;
                            const doneCount = project.done_count ?? 0;
                            return (
                                <Link
                                    key={project.id}
                                    to={`/projects/${project.id}`}
                                    className='flex items-center gap-3 rounded-card border p-4 transition-colors hover:bg-white/5'
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
                        })}
                    </div>
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
