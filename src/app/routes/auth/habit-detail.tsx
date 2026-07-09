import { AppHeader } from '@/components/layouts/app-header';
import { ErrorPage } from '@/components/layouts/error-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { HabitDetailBody } from '@/features/habits/components/details/habit-detail-body';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { Link, useLocation, useNavigate } from 'react-router';
import type { Route } from './+types/habit-detail';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Habit Tracker' },
        { name: 'description', content: 'Habit detail' }
    ];
}

export default function HabitDetail({
    params
}: Route.ComponentProps & { params: { habitId: string } }) {
    const habitId = parseInt(params.habitId, 10);
    const navigate = useNavigate();
    const location = useLocation();
    const fromToday = (location.state as { from?: string } | null)?.from === 'today';
    const backTo = fromToday ? '/' : '/habits';
    const backLabel = fromToday ? '‹ Today' : '‹ Habits';

    if (isNaN(habitId)) {
        return <ErrorPage message='Invalid habit ID' />;
    }

    return (
        <ProtectedRoute>
            <div className='min-h-screen' style={{ backgroundColor: 'var(--bg)' }}>
                <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
                <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                    <Link
                        to={backTo}
                        className='mb-4 inline-block font-mono text-[12.5px] text-text-muted transition-colors hover:text-text-secondary'
                    >
                        {backLabel}
                    </Link>
                    <HabitDetailBody habitId={habitId} onDeleted={() => navigate('/habits')} />
                </div>
            </div>
        </ProtectedRoute>
    );
}
