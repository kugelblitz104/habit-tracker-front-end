import { ProjectsPage } from '@/components/layouts/projects-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/projects';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Projects' }, { name: 'description', content: 'Your projects' }];
}

export default function Projects() {
    return (
        <ProtectedRoute>
            <ProjectsPage />
        </ProtectedRoute>
    );
}
