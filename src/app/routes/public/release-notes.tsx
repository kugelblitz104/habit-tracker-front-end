import { ReleaseNotesPage } from '@/components/layouts/release-notes-page';
import type { Route } from './+types/release-notes';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Release notes' },
        { name: 'description', content: "What's new in Habit Tracker" },
        // The route is unlisted: linked only from Settings, and kept out of
        // search results.
        { name: 'robots', content: 'noindex' }
    ];
}

export default function ReleaseNotes() {
    return <ReleaseNotesPage />;
}
