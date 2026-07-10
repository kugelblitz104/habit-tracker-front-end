import { TimerPage } from '@/components/layouts/timer-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/timer';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Timer' },
        { name: 'description', content: 'Pomodoro & stopwatch time tracking' }
    ];
}

export default function Timer() {
    return (
        <ProtectedRoute>
            <TimerPage />
        </ProtectedRoute>
    );
}
