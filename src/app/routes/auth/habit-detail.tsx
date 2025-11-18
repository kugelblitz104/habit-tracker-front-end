import { HabitDetailView } from '@/components/layouts/habit-detail-view';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Habit Tracker' },
        { name: 'description', content: 'Welcome to React Router!' }
    ];
}

export default function HabitDetail({
    params
}: Route.ComponentProps & { params: { habitId: string } }) {
    return (
        <ProtectedRoute>
            <HabitDetailView habitId={Number(params.habitId)} />
        </ProtectedRoute>
    );
}
