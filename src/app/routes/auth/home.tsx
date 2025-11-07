import type { Route } from './+types/home';
import { HabitsDashboard } from '@/components/layouts/habits-dashboard';
import { ProtectedRoute } from '@/components/auth/protected-route';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Habit Tracker' },
        { name: 'description', content: 'Welcome to React Router!' }
    ];
}

export default function Home() {
    return (
        <ProtectedRoute>
            <HabitsDashboard />
        </ProtectedRoute>
    );
}
