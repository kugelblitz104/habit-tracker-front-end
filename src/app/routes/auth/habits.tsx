import { HabitsDashboard } from '@/components/layouts/habits-dashboard-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/habits';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Habits' },
        { name: 'description', content: 'Your habit dashboard' }
    ];
}

export default function Habits() {
    return (
        <ProtectedRoute>
            <HabitsDashboard />
        </ProtectedRoute>
    );
}
