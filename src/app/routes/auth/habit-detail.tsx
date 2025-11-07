import { HabitDetailView } from '@/components/layouts/habit-detail-view';
import type { Route } from './+types/home';
import { ProtectedRoute } from '@/components/auth/protected-route';

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
