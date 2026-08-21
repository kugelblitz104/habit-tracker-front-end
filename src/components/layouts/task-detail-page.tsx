import { AppHeader } from '@/components/layouts/app-header';
import { BackLink } from '@/components/ui/back-link';
import { ErrorPage } from '@/components/layouts/error-page';
import { LoadingPage } from '@/components/layouts/loading-page';
import { getTaskQueryOptions, useTaskBySlug } from '@/features/tasks/api/get-tasks';
import { TaskDetailBody } from '@/features/tasks/components/task-detail-body';
import { parseEntityRef } from '@/lib/entity-ref';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

type DetailState = { from?: string; editing?: boolean } | null;

/**
 * Where the back link and the detail's close button go.
 *
 * `from` is the origin pathname stashed by the task list (Today `/` or a project
 * `/projects/:id`). Project origins return to that project; anything else
 * (including a fresh deep-link) falls back to Today.
 */
function useBackTo() {
    const state = useLocation().state as DetailState;
    const from = state?.from;
    const fromProject = typeof from === 'string' && from.startsWith('/projects');
    return {
        backTo: fromProject ? from : '/',
        backLabel: fromProject ? 'Back' : 'Today',
        editing: state?.editing ?? false
    };
}

/** The chrome around the detail body: back-nav, header, width. */
function TaskDetailShell({ children }: { children: React.ReactNode }) {
    const { backTo, backLabel } = useBackTo();

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <BackLink
                    to={backTo}
                    label={backLabel}
                    // 'Back to Back' would be nonsense for the project origin.
                    ariaLabel={backLabel === 'Back' ? 'Back' : undefined}
                    className='mb-4 font-mono text-[12.5px] text-text-muted transition-colors hover:text-text-secondary'
                />

                <div className='mx-auto max-w-[640px]'>{children}</div>
            </div>
        </div>
    );
}

function TaskDetailContent({ taskId }: { taskId: number }) {
    const navigate = useNavigate();
    const { backTo, editing } = useBackTo();

    return (
        <TaskDetailBody taskId={taskId} onClose={() => navigate(backTo)} defaultEditing={editing} />
    );
}

/**
 * Slug URLs (`/tasks/setup-utilities`) resolve the slug to a task, then hand the
 * resolved id to the same body the numeric route renders.
 *
 * The resolved task is written into the by-id cache so `TaskDetailBody`'s own
 * `useTask` reads it instead of fetching the same row again, so a slug
 * deep-link costs one request, not two.
 *
 * That write is deliberately in the render pass rather than an effect. Child
 * effects run before the parent's, so an effect here fires only after
 * `TaskDetailBody` has already started its own request. Measured, not assumed.
 * Nothing is subscribed to the by-id key yet (the child has not mounted), so the
 * write notifies no one, and the app's 60s `staleTime` leaves the seeded entry
 * fresh enough that `useTask` does not revalidate it.
 *
 * Slugs are unique per profile, so resolution is scoped to the active profile: a
 * link to a task in a profile you are not currently in reads as not-found rather
 * than opening the wrong task.
 */
function TaskDetailBySlug({ slug }: { slug: string }) {
    const { activeProfileId } = useAuth();
    const queryClient = useQueryClient();
    const slugQuery = useTaskBySlug({ slug, profileId: activeProfileId });
    const task = slugQuery.data ?? null;

    if (task) {
        queryClient.setQueryData(getTaskQueryOptions(task.id).queryKey, task);
    }

    if (slugQuery.isPending) return <LoadingPage />;
    if (!task) {
        return <ErrorPage message="That task link doesn't match a task in this profile." />;
    }
    return <TaskDetailContent taskId={task.id} />;
}

export const TaskDetailPage = ({ taskRef }: { taskRef: string }) => {
    const ref = parseEntityRef(taskRef);

    if (ref === null) {
        return <ErrorPage message='Invalid task URL' />;
    }

    return (
        <TaskDetailShell>
            {'id' in ref ? (
                <TaskDetailContent taskId={ref.id} />
            ) : (
                <TaskDetailBySlug slug={ref.slug} />
            )}
        </TaskDetailShell>
    );
};
