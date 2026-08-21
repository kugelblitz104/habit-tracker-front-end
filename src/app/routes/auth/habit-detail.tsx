import { HabitDetailPage } from '@/components/layouts/habit-detail-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/habit-detail';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Habit Tracker' }, { name: 'description', content: 'Habit detail' }];
}

export default function HabitDetail({
    params
}: Route.ComponentProps & { params: { habitRef: string } }) {
    return (
        <ProtectedRoute>
            <HabitDetailPage habitRef={params.habitRef} />
        </ProtectedRoute>
    );
}
