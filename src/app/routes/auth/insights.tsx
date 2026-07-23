import { InsightsPage } from '@/components/layouts/insights-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/insights';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Insights' },
        { name: 'description', content: 'Review your tasks, time and habits over time' }
    ];
}

export default function Insights() {
    return (
        <ProtectedRoute>
            <InsightsPage />
        </ProtectedRoute>
    );
}
