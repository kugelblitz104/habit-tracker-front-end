import { HabitDetailView } from '@/components/layouts/habit-detail-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/home';
import { ErrorPage } from '@/components/layouts/error-page';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Habit Tracker' },
        { name: 'description', content: 'Welcome to React Router!' }
    ];
}

export default function HabitDetail({
    params
}: Route.ComponentProps & { params: { habitId: string } }) {
    const habitId = parseInt(params.habitId, 10);

    if (isNaN(habitId)) {
        return <ErrorPage message='Invalid habit ID' />;
    }

    return (
        <ProtectedRoute>
            <HabitDetailView habitId={habitId} />
        </ProtectedRoute>
    );
}
