import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/settings';
import { SettingsPage } from '@/components/layouts/settings-page';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Habit Tracker' },
        { name: 'description', content: 'Welcome to React Router!' }
    ];
}

export default function Home() {
    return (
        <ProtectedRoute>
            <SettingsPage />
        </ProtectedRoute>
    );
}
