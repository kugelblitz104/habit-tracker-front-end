import { AppHeader } from '@/components/layouts/app-header';
import { BackLink } from '@/components/ui/back-link';
import { ErrorPage } from '@/components/layouts/error-page';
import { LoadingPage } from '@/components/layouts/loading-page';
import { useHabitBySlug } from '@/features/habits/api/get-habits';
import { habitKeys } from '@/features/habits/api/query-keys';
import { HabitDetailBody } from '@/features/habits/components/details/habit-detail-body';
import { useAuth } from '@/lib/auth-context';
import { parseEntityRef } from '@/lib/entity-ref';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { useSlugResolution } from '@/lib/use-slug-resolution';
import { useLocation, useNavigate } from 'react-router';

/** Back-nav target: Today when that's where the habit was opened from. */
function useBackTo() {
    const fromToday = (useLocation().state as { from?: string } | null)?.from === 'today';
    return {
        backTo: fromToday ? '/' : '/habits',
        backLabel: fromToday ? 'Today' : 'Habits'
    };
}

/** The chrome around the detail body: back-nav, header, width. */
function HabitDetailShell({ children }: { children: React.ReactNode }) {
    const { backTo, backLabel } = useBackTo();

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <BackLink
                    to={backTo}
                    label={backLabel}
                    className='mb-4 font-mono text-[12.5px] text-text-muted transition-colors hover:text-text-secondary'
                />
                {children}
            </div>
        </div>
    );
}

function HabitDetailContent({ habitId }: { habitId: number }) {
    const navigate = useNavigate();
    return <HabitDetailBody habitId={habitId} onDeleted={() => navigate('/habits')} />;
}

/**
 * Slug URLs (`/habits/daily-stretch`) resolve the slug to a habit, then hand the
 * resolved id to the same body the numeric route renders. Resolution is scoped
 * to the active profile, since slugs are unique per profile.
 */
function HabitDetailBySlug({ slug }: { slug: string }) {
    const { activeProfileId } = useAuth();
    const query = useHabitBySlug({ slug, profileId: activeProfileId });
    const { id, isPending, notFound } = useSlugResolution(query, (habit) =>
        habitKeys.detail(habit.id)
    );

    if (isPending) return <LoadingPage />;
    if (notFound || id === null) {
        return <ErrorPage message="That habit link doesn't match a habit in this profile." />;
    }
    return <HabitDetailContent habitId={id} />;
}

export const HabitDetailPage = ({ habitRef }: { habitRef: string }) => {
    const ref = parseEntityRef(habitRef);

    if (ref === null) {
        return <ErrorPage message='Invalid habit URL' />;
    }

    return (
        <HabitDetailShell>
            {'id' in ref ? (
                <HabitDetailContent habitId={ref.id} />
            ) : (
                <HabitDetailBySlug slug={ref.slug} />
            )}
        </HabitDetailShell>
    );
};
