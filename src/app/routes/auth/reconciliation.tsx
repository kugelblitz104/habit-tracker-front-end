import { ReconciliationPage } from '@/components/layouts/reconciliation-page';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import type { Route } from './+types/reconciliation';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'The reconciliation' },
        {
            name: 'description',
            content: 'Clear the graveyard: decide what to keep, reschedule or let go.'
        },
        // Unlisted, like /release-notes: reached from the Today card, not the nav.
        { name: 'robots', content: 'noindex' }
    ];
}

export default function Reconciliation() {
    return (
        <ProtectedRoute>
            <ReconciliationPage />
        </ProtectedRoute>
    );
}
