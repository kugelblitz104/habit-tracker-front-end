import { TodayDashboard } from '@/components/layouts/today-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/today';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Today' }, { name: 'description', content: 'Your tasks for today' }];
}

export default function Today() {
    return (
        <ProtectedRoute>
            <TodayDashboard />
        </ProtectedRoute>
    );
}
