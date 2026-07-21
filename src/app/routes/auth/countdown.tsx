import { CountdownDashboard } from '@/components/layouts/countdown-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/countdown';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Countdown' },
        { name: 'description', content: 'Deadlines by time remaining' }
    ];
}

export default function Countdown() {
    return (
        <ProtectedRoute>
            <CountdownDashboard />
        </ProtectedRoute>
    );
}
