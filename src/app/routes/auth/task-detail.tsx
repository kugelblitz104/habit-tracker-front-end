import { TaskDetailPage } from '@/components/layouts/task-detail-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/task-detail';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Habit Tracker' }, { name: 'description', content: 'Task detail' }];
}

export default function TaskDetail({
    params
}: Route.ComponentProps & { params: { taskRef: string } }) {
    return (
        <ProtectedRoute>
            <TaskDetailPage taskRef={params.taskRef} />
        </ProtectedRoute>
    );
}
