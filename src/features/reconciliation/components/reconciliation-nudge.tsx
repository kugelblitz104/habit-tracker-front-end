import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/lib/auth-context';
import { toLocalDateString } from '@/lib/date-utils';
import { Scale } from 'lucide-react';
import { useState } from 'react';

import { useReconciliationQueues } from '../hooks/use-reconciliation-queues';
import { daysSinceLastRun, readLastRun, shouldNudge } from '../utils/last-run';

/**
 * Today's way in to the reconciliation.
 *
 * Passive by design - a card on a page you were already on, never a
 * notification that chases you. The presentation is the shared `Banner`; what
 * lives here is the decision about *whether* to say anything, which is the only
 * part that is about reconciliation.
 *
 * `includeHabits: false` is the load-bearing part: the three queues it does
 * count all read cache entries `today-page.tsx` already populates, so the card
 * costs **zero** extra requests. Counting the habit queue would mean one
 * tracker request per active habit on the app's most-visited page, to decorate
 * a nudge. The consequence is deliberate and worth knowing: if the habit queue
 * alone has rows, no card appears. The page itself still counts all four.
 */
export const ReconciliationNudge = () => {
    const { activeProfileId } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const { cheapCount } = useReconciliationQueues({ includeHabits: false });

    const today = toLocalDateString(new Date());
    const lastRun = activeProfileId ? readLastRun(activeProfileId) : null;

    if (dismissed || !shouldNudge(lastRun, today, cheapCount > 0)) return null;

    const daysSince = daysSinceLastRun(lastRun, today);

    return (
        <Banner
            className='mb-6'
            icon={<Scale className='h-4 w-4' />}
            title={`${cheapCount} ${cheapCount === 1 ? 'thing' : 'things'} to decide`}
            detail={
                daysSince === null
                    ? 'You have never reconciled this profile'
                    : `Last reconciled ${daysSince} days ago`
            }
            action={{ label: 'Reconcile', to: '/reconciliation' }}
            onDismiss={() => setDismissed(true)}
            dismissLabel='Dismiss the reconciliation reminder'
        />
    );
};
