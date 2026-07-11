import { AllTasksDashboard } from '@/components/layouts/all-tasks-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/tasks';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'All tasks' }, { name: 'description', content: 'All your tasks' }];
}

export default function Tasks() {
    return (
        <ProtectedRoute>
            <AllTasksDashboard />
        </ProtectedRoute>
    );
}
