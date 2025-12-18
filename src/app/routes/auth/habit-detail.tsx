import { HabitDetailView } from '@/components/layouts/habit-detail-view';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/home';
import { ErrorScreen } from '@/components/layouts/error-screen';

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
        return <ErrorScreen message='Invalid habit ID' />;
    }

    return (
        <ProtectedRoute>
            <HabitDetailView habitId={habitId} />
        </ProtectedRoute>
    );
}
