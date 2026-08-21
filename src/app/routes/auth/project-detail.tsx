import { ProjectDetailPage } from '@/components/layouts/project-detail-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/project-detail';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Project' }, { name: 'description', content: 'Project view' }];
}

export default function ProjectDetail({
    params
}: Route.ComponentProps & { params: { projectRef: string } }) {
    return (
        <ProtectedRoute>
            <ProjectDetailPage projectRef={params.projectRef} />
        </ProtectedRoute>
    );
}
