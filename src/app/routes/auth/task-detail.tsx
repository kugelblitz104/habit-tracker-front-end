import { AppHeader } from '@/components/layouts/app-header';
import { ErrorPage } from '@/components/layouts/error-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { TaskDetailBody } from '@/features/tasks/components/task-detail-body';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { Link, useLocation, useNavigate } from 'react-router';
import type { Route } from './+types/task-detail';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Habit Tracker' }, { name: 'description', content: 'Task detail' }];
}

function TaskDetailContent({ taskId }: { taskId: number }) {
    const navigate = useNavigate();
    const location = useLocation();

    // `from` is the origin pathname stashed by the task list (Today `/` or a
    // project `/projects/:id`). Project origins return to that project; anything
    // else (including a fresh deep-link) falls back to Today.
    const state = location.state as { from?: string; editing?: boolean } | null;
    const from = state?.from;
    const fromProject = typeof from === 'string' && from.startsWith('/projects');
    const backTo = fromProject ? from : '/';
    const backLabel = fromProject ? '‹ Back' : '‹ Today';

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <Link
                    to={backTo}
                    className='mb-4 inline-block font-mono text-[12.5px] text-text-muted transition-colors hover:text-text-secondary'
                >
                    {backLabel}
                </Link>

                <div className='mx-auto max-w-[640px]'>
                    <TaskDetailBody
                        taskId={taskId}
                        onClose={() => navigate(backTo)}
                        defaultEditing={state?.editing ?? false}
                    />
                </div>
            </div>
        </div>
    );
}

export default function TaskDetail({
    params
}: Route.ComponentProps & { params: { taskId: string } }) {
    const taskId = parseInt(params.taskId, 10);

    if (isNaN(taskId)) {
        return <ErrorPage message='Invalid task ID' />;
    }

    return (
        <ProtectedRoute>
            <TaskDetailContent taskId={taskId} />
        </ProtectedRoute>
    );
}
