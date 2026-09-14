import { JournalDayPage } from '@/components/layouts/journal-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/journal';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Journal' },
        { name: 'description', content: "One day's entry, and what you finished" }
    ];
}

export default function Journal() {
    return (
        <ProtectedRoute>
            <JournalDayPage />
        </ProtectedRoute>
    );
}
